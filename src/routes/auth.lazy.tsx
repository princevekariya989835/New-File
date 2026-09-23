import { createLazyFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminPanelAccess } from "@/lib/auth";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";

export const Route = createLazyFileRoute("/auth")({ component: AuthPage });

type AuthMode = "signin" | "signup" | "signup_verify" | "forgot" | "forgot_verify";

export function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const {
    user,
    loading: authLoading,
    signIn,
    sendOtp,
    verifyAndRegister,
    verifyAndResetPassword,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(search?.mode === "signin" ? "signin" : "signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync mode with URL query parameter
  useEffect(() => {
    if (search?.mode && ["signin", "signup", "forgot", "signup_verify", "forgot_verify"].includes(search.mode)) {
      setMode(search.mode as AuthMode);
    }
  }, [search?.mode]);

  function handleSwitchMode(newMode: AuthMode, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setMode(newMode);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("mode", newMode);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
    navigate({
      to: "/auth",
      search: (prev: any) => ({ ...prev, mode: newMode }),
      replace: true,
    }).catch(() => {});
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      const rawRedirect = search?.redirect;
      const isSafeRedirect =
        typeof rawRedirect === "string" &&
        rawRedirect.startsWith("/") &&
        !rawRedirect.startsWith("//") &&
        !rawRedirect.includes("\\");

      if (isSafeRedirect) {
        navigate({ to: rawRedirect as any });
      } else if (hasAdminPanelAccess(user)) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    }
  }, [user, authLoading, navigate, search?.redirect]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn(email.trim(), password);
      if (!res.ok) {
        toast.error(res.error || "Invalid email or password.");
        return;
      }
      toast.success("Welcome back to RIOTOUS.");
      const isAdmin = hasAdminPanelAccess(res.session?.user);
      if (search?.redirect) {
        navigate({ to: search.redirect as any });
      } else if (isAdmin) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestSignupOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(email.trim(), "signup");
      if (!res.ok) {
        toast.error(res.error || "Failed to send verification code.");
        return;
      }
      toast.success(`Verification code sent to ${email.trim()}`);
      setMode("signup_verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    setLoading(true);
    try {
      const res = await verifyAndRegister(email.trim(), password, fullName, otp.trim());
      if (!res.ok) {
        toast.error(res.error || "Verification failed");
        return;
      }
      toast.success("Account created successfully. Welcome to RIOTOUS!");
      const isAdmin = hasAdminPanelAccess(res.session?.user);
      if (search?.redirect) {
        navigate({ to: search.redirect as any });
      } else if (isAdmin) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(email.trim(), "forgot_password");
      if (!res.ok) {
        toast.error(res.error || "Failed to send reset code.");
        return;
      }
      toast.success(`Password reset code sent to ${email.trim()}`);
      setMode("forgot_verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim() || !newPassword) {
      toast.error("Please enter the OTP code and new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyAndResetPassword(email.trim(), otp.trim(), newPassword);
      if (!res.ok) {
        toast.error(res.error || "Password reset failed");
        return;
      }
      toast.success("Password reset successfully! You are now signed in.");
      const isAdmin = hasAdminPanelAccess(res.session?.user);
      if (search?.redirect) {
        navigate({ to: search.redirect as any });
      } else if (isAdmin) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "signup" || mode === "signup_verify";

  return (
    <div className="page login-10">
      {/* Ambient Backdrop */}
      <div className="backdrop-glow" />
      <div className="backdrop-pattern" />

      {/* Main Sliding Card */}
      <div className={`card ${isRegister ? "register" : ""}`}>
        {/* Mobile View Toggle Bar */}
        <div className="mobile-toggle">
          <button
            type="button"
            className={`mobile-toggle-btn ${!isRegister ? "active" : ""}`}
            onClick={(e) => handleSwitchMode("signin", e)}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`mobile-toggle-btn ${isRegister ? "active" : ""}`}
            onClick={(e) => handleSwitchMode("signup", e)}
          >
            Sign Up
          </button>
        </div>

        {/* Sliding Background Image Layer */}
        <div className="card-bg">
          <div className="card-bg-overlay" />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* HERO: Shown on the RIGHT when in Login mode                   */}
        {/* ------------------------------------------------------------- */}
        <div className="hero login">
          <span className="brand-tagline">WEAR YOUR CHAOS</span>
          <h2>New Here?</h2>
          <p>
            Join the movement. Create custom t-shirt creations, track your orders, and grab exclusive drops.
          </p>
          <button
            type="button"
            className="switch"
            onClick={(e) => handleSwitchMode("signup", e)}
          >
            Create Account
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* HERO: Shown on the LEFT when in Register mode                 */}
        {/* ------------------------------------------------------------- */}
        <div className="hero register">
          <span className="brand-tagline">MORE THAN CLOTHING</span>
          <h2>Welcome Back!</h2>
          <p>
            Already an insider? Sign in to load your saved design fits, active coupons, and speedy checkout.
          </p>
          <button
            type="button"
            className="switch"
            onClick={(e) => handleSwitchMode("signin", e)}
          >
            Sign In
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* FORM: LOGIN (Shown on the LEFT when in Login mode)            */}
        {/* ------------------------------------------------------------- */}
        <div className="form login">
          <div className="form-inner">
            {/* SIGN IN SUB-STATE */}
            {mode === "signin" && (
              <>
                <h2>
                  Sign In to RI<span className="text-brand-red">O</span>T<span className="text-brand-red">O</span>US
                </h2>
                <p className="subtitle">Enter your email and password to access your account</p>

                <form onSubmit={handleSignIn}>
                  <div>
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label>Password</label>
                    <div className="password-field">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="remember-forgot">
                    <div className="remember">
                      <input
                        type="checkbox"
                        id="remember-me-login"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <label htmlFor="remember-me-login" className="cursor-pointer select-none m-0 font-normal normal-case">
                        Remember me
                      </label>
                    </div>
                    <button
                      type="button"
                      className="forgot"
                      onClick={(e) => handleSwitchMode("forgot", e)}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                  </button>
                </form>
              </>
            )}

            {/* FORGOT PASSWORD SUB-STATE */}
            {mode === "forgot" && (
              <>
                <h2>Reset Password</h2>
                <p className="subtitle">Enter your registered email to receive a recovery code</p>

                <form onSubmit={handleRequestForgotOtp}>
                  <div>
                    <label>Account Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Code"}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSwitchMode("signin", e)}
                    className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 pt-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                  </button>
                </form>
              </>
            )}

            {/* FORGOT VERIFY & NEW PASSWORD SUB-STATE */}
            {mode === "forgot_verify" && (
              <>
                <h2>Set New Password</h2>
                <p className="subtitle">Enter the 6-digit code sent to {email}</p>

                <form onSubmit={handleVerifyAndResetPassword}>
                  <div>
                    <label className="text-center">6-Digit Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="text-center font-mono tracking-widest text-lg"
                    />
                  </div>

                  <div>
                    <label>New Password</label>
                    <div className="password-field">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="eye"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Reset Password"}
                  </button>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleSwitchMode("forgot", e)}
                      className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        const res = await sendOtp(email, "forgot_password");
                        setLoading(false);
                        if (res.ok) toast.success("New code sent!");
                        else toast.error(res.error || "Failed to resend code");
                      }}
                      className="text-brand-red font-semibold hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* FORM: REGISTER (Shown on the RIGHT when in Register mode)     */}
        {/* ------------------------------------------------------------- */}
        <div className="form register">
          <div className="form-inner">
            {/* SIGN UP SUB-STATE */}
            {mode === "signup" && (
              <>
                <h2>
                  Create Your RI<span className="text-brand-red">O</span>T<span className="text-brand-red">O</span>US Account
                </h2>
                <p className="subtitle">Join the streetwear movement & save custom fits</p>

                <form onSubmit={handleRequestSignupOtp}>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label>First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <label>Last Name</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div>
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label>Password</label>
                      <div className="password-field">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="eye"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label>Confirm</label>
                      <div className="password-field">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="eye"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="terms-agree-signup"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 accent-[#f00b11] cursor-pointer"
                    />
                    <label htmlFor="terms-agree-signup" className="text-[11px] leading-tight text-neutral-600 cursor-pointer select-none font-normal normal-case">
                      I agree to the{" "}
                      <Link to="/terms" target="_blank" className="font-semibold text-neutral-900 underline hover:text-brand-red">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" target="_blank" className="font-semibold text-neutral-900 underline hover:text-brand-red">
                        Privacy Policy
                      </Link>
                      .
                    </label>
                  </div>

                  <button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                  </button>

                  <div className="text-center text-xs text-neutral-500 pt-1 md:hidden">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={(e) => handleSwitchMode("signin", e)}
                      className="font-bold text-neutral-900 underline hover:text-brand-red cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* SIGN UP OTP VERIFY SUB-STATE */}
            {mode === "signup_verify" && (
              <>
                <h2>Verify Your Email</h2>
                <p className="subtitle">We sent a 6-digit code to {email}</p>

                <form onSubmit={handleVerifyAndSignup}>
                  <div>
                    <label className="text-center">6-Digit Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="text-center font-mono tracking-widest text-lg"
                    />
                  </div>

                  <button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Complete Signup"}
                  </button>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        const res = await sendOtp(email, "signup");
                        setLoading(false);
                        if (res.ok) toast.success("New code sent!");
                        else toast.error(res.error || "Failed to resend code");
                      }}
                      className="text-brand-red font-semibold hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
