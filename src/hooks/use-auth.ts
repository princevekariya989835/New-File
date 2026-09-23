import { useEffect, useState } from "react";
import {
  decodeToken,
  getCurrentUserServerFn,
  loginServerFn,
  registerServerFn,
  sendOtpServerFn,
  verifyAndRegisterServerFn,
  verifyAndResetPasswordServerFn,
  type AuthSession,
  type AuthUser,
} from "@/lib/auth";

type UserWithMeta = (AuthUser & { user_metadata?: { full_name?: string | null } }) | null;

// Module-level singleton state for session deduplication and cross-component sharing
let _moduleUser: UserWithMeta = null;
let _moduleToken: string | null = null;
let _lastVerifiedAt = 0;
let _inFlightUserPromise: Promise<UserWithMeta> | null = null;
const _authListeners = new Set<(user: UserWithMeta, loading: boolean) => void>();

function notifyAuthListeners(user: UserWithMeta, loading: boolean) {
  _authListeners.forEach((fn) => {
    try {
      fn(user, loading);
    } catch {
      // ignore
    }
  });
}

function getSessionCookieAttributes(maxAge: number): string {
  const isSecure = typeof location !== "undefined" && location.protocol === "https:";
  return `path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

/**
 * Deduplicated user session retriever and background verifier.
 * Ensures that even if 50+ components mount simultaneously, only 1 request
 * is ever sent to getCurrentUserServerFn across the entire page.
 */
async function getOrVerifyUser(): Promise<UserWithMeta> {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("riotous_session");
  if (!token) {
    _moduleUser = null;
    _moduleToken = null;
    _lastVerifiedAt = 0;
    notifyAuthListeners(null, false);
    return null;
  }

  // Keep cookie synchronized with localStorage session token
  document.cookie = `riotous_session=${encodeURIComponent(token)}; ${getSessionCookieAttributes(2592000)}`;

  // If token unchanged and verified within the last 60 seconds, return the fresh cached user
  if (_moduleUser && _moduleToken === token && Date.now() - _lastVerifiedAt < 60_000) {
    return _moduleUser;
  }

  // If an in-flight verification request already exists for this token, join that existing promise
  if (_inFlightUserPromise) {
    return _inFlightUserPromise;
  }

  // Optimistically populate from decoded JWT token so UI isn't blocked
  const decoded = decodeToken(token);
  if (decoded && !_moduleUser) {
    _moduleUser = {
      ...decoded,
      user_metadata: { full_name: decoded.fullName },
    };
    _moduleToken = token;
    notifyAuthListeners(_moduleUser, false);
  }

  // Background verification with server
  _inFlightUserPromise = (async () => {
    try {
      const u = await getCurrentUserServerFn({ data: { token } });
      if (u) {
        _moduleUser = {
          ...u,
          user_metadata: { full_name: u.fullName },
        };
        _moduleToken = token;
        _lastVerifiedAt = Date.now();
        notifyAuthListeners(_moduleUser, false);
        return _moduleUser;
      } else {
        localStorage.removeItem("riotous_session");
        document.cookie = `riotous_session=; ${getSessionCookieAttributes(0)}`;
        _moduleUser = null;
        _moduleToken = null;
        _lastVerifiedAt = 0;
        notifyAuthListeners(null, false);
        return null;
      }
    } catch {
      // In case of network error, preserve optimistic decoded state if valid
      return _moduleUser;
    } finally {
      _inFlightUserPromise = null;
    }
  })();

  return _inFlightUserPromise;
}

export function useAuth() {
  const [user, setUser] = useState<UserWithMeta>(_moduleUser);
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !_moduleUser && Boolean(localStorage.getItem("riotous_session"));
  });

  useEffect(() => {
    const listener = (newUser: UserWithMeta, newLoading: boolean) => {
      setUser(newUser);
      setLoading(newLoading);
    };
    _authListeners.add(listener);

    // Initial check or refresh
    getOrVerifyUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "riotous_session") {
        getOrVerifyUser().then((u) => {
          setUser(u);
          setLoading(false);
        });
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      _authListeners.delete(listener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginServerFn({ data: { email, password } });
    if (res.ok && res.session) {
      const token = res.session.token;
      localStorage.setItem("riotous_session", token);
      document.cookie = `riotous_session=${encodeURIComponent(token)}; ${getSessionCookieAttributes(2592000)}`;
      const newUser: UserWithMeta = {
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      };
      _moduleUser = newUser;
      _moduleToken = token;
      _lastVerifiedAt = Date.now();
      notifyAuthListeners(newUser, false);
      setUser(newUser);
      setLoading(false);
    }
    return res;
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await registerServerFn({ data: { email, password, fullName } });
    if (res.ok && res.session) {
      const token = res.session.token;
      localStorage.setItem("riotous_session", token);
      document.cookie = `riotous_session=${encodeURIComponent(token)}; ${getSessionCookieAttributes(2592000)}`;
      const newUser: UserWithMeta = {
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      };
      _moduleUser = newUser;
      _moduleToken = token;
      _lastVerifiedAt = Date.now();
      notifyAuthListeners(newUser, false);
      setUser(newUser);
      setLoading(false);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem("riotous_session");
    document.cookie = `riotous_session=; ${getSessionCookieAttributes(0)}`;
    _moduleUser = null;
    _moduleToken = null;
    _lastVerifiedAt = 0;
    notifyAuthListeners(null, false);
    setUser(null);
    setLoading(false);
  };

  const sendOtp = async (email: string, purpose: "signup" | "forgot_password") => {
    return await sendOtpServerFn({ data: { email, purpose } });
  };

  const verifyAndRegister = async (
    email: string,
    password: string,
    fullName: string | undefined,
    otp: string,
  ) => {
    const res = await verifyAndRegisterServerFn({ data: { email, password, fullName, otp } });
    if (res.ok && res.session) {
      const token = res.session.token;
      localStorage.setItem("riotous_session", token);
      document.cookie = `riotous_session=${encodeURIComponent(token)}; ${getSessionCookieAttributes(2592000)}`;
      const newUser: UserWithMeta = {
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      };
      _moduleUser = newUser;
      _moduleToken = token;
      _lastVerifiedAt = Date.now();
      notifyAuthListeners(newUser, false);
      setUser(newUser);
      setLoading(false);
    }
    return res;
  };

  const verifyAndResetPassword = async (email: string, otp: string, newPassword: string) => {
    const res = await verifyAndResetPasswordServerFn({ data: { email, otp, newPassword } });
    if (res.ok && res.session) {
      const token = res.session.token;
      localStorage.setItem("riotous_session", token);
      document.cookie = `riotous_session=${encodeURIComponent(token)}; ${getSessionCookieAttributes(2592000)}`;
      const newUser: UserWithMeta = {
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      };
      _moduleUser = newUser;
      _moduleToken = token;
      _lastVerifiedAt = Date.now();
      notifyAuthListeners(newUser, false);
      setUser(newUser);
      setLoading(false);
    }
    return res;
  };

  return {
    user,
    session: user ? { user } : null,
    loading,
    login,
    register,
    signIn: login,
    signUp: register,
    sendOtp,
    verifyAndRegister,
    verifyAndResetPassword,
    logout,
    signOut: logout,
  };
}
