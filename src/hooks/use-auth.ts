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

export function useAuth() {
  const [user, setUser] = useState<
    (AuthUser & { user_metadata?: { full_name?: string | null } }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function loadUser() {
      const token = localStorage.getItem("riotous_session");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Keep cookie synchronized with localStorage session token
      document.cookie = `riotous_session=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;

      const decoded = decodeToken(token);
      if (decoded) {
        setUser({
          ...decoded,
          user_metadata: { full_name: decoded.fullName },
        });
        setLoading(false);
        // Verify with server in background
        getCurrentUserServerFn({ data: { token } })
          .then((u) => {
            if (u) {
              setUser({
                ...u,
                user_metadata: { full_name: u.fullName },
              });
            } else {
              localStorage.removeItem("riotous_session");
              document.cookie = "riotous_session=; path=/; max-age=0; SameSite=Lax";
              setUser(null);
            }
          })
          .catch(() => {});
      } else {
        localStorage.removeItem("riotous_session");
        document.cookie = "riotous_session=; path=/; max-age=0; SameSite=Lax";
        setUser(null);
        setLoading(false);
      }
    }

    loadUser();

    function handleAuthChange() {
      loadUser();
    }

    window.addEventListener("riotous_auth_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("riotous_auth_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginServerFn({ data: { email, password } });
    if (res.ok && res.session) {
      localStorage.setItem("riotous_session", res.session.token);
      document.cookie = `riotous_session=${encodeURIComponent(res.session.token)}; path=/; max-age=2592000; SameSite=Lax`;
      setUser({
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      });
      window.dispatchEvent(new Event("riotous_auth_changed"));
    }
    return res;
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await registerServerFn({ data: { email, password, fullName } });
    if (res.ok && res.session) {
      localStorage.setItem("riotous_session", res.session.token);
      document.cookie = `riotous_session=${encodeURIComponent(res.session.token)}; path=/; max-age=2592000; SameSite=Lax`;
      setUser({
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      });
      window.dispatchEvent(new Event("riotous_auth_changed"));
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem("riotous_session");
    document.cookie = "riotous_session=; path=/; max-age=0; SameSite=Lax";
    setUser(null);
    window.dispatchEvent(new Event("riotous_auth_changed"));
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
      localStorage.setItem("riotous_session", res.session.token);
      document.cookie = `riotous_session=${encodeURIComponent(res.session.token)}; path=/; max-age=2592000; SameSite=Lax`;
      setUser({
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      });
      window.dispatchEvent(new Event("riotous_auth_changed"));
    }
    return res;
  };

  const verifyAndResetPassword = async (email: string, otp: string, newPassword: string) => {
    const res = await verifyAndResetPasswordServerFn({ data: { email, otp, newPassword } });
    if (res.ok && res.session) {
      localStorage.setItem("riotous_session", res.session.token);
      document.cookie = `riotous_session=${encodeURIComponent(res.session.token)}; path=/; max-age=2592000; SameSite=Lax`;
      setUser({
        ...res.session.user,
        user_metadata: { full_name: res.session.user.fullName },
      });
      window.dispatchEvent(new Event("riotous_auth_changed"));
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
