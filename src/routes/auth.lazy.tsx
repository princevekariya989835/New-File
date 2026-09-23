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

  function handleSocialLogin(provider: string) {
    toast.info(`${provider} sign-in will be available with the next store drop.`);
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
          <span className="brand-tagline">RIOTOUS STREETWEAR</span>
          <h2>New Here?</h2>
          <p>
            Create your account to unlock live custom t-shirt design tools, track orders, and grab exclusive drops.
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
          <span className="brand-tagline">MEMBER ACCESS</span>
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

                  <div className="or">
                    <span>or continue with</span>
                  </div>

                  <div className="socials">
                    <button
                      type="button"
                      className="social-btn"
                      onClick={() => handleSocialLogin("Google")}
                      title="Sign in with Google"
                      aria-label="Sign in with Google"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="social-btn"
                      onClick={() => handleSocialLogin("Apple")}
                      title="Sign in with Apple"
                      aria-label="Sign in with Apple"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.23-7.94-9.39-16.73-12.49-26.36-3.1-9.63-4.65-18.79-4.65-27.48 0-12.62 3.24-23.23 9.71-31.84 6.47-8.61 14.78-13.04 24.94-13.3 4.89 0 10.15 1.25 15.78 3.75 5.63 2.5 9.4 3.78 11.31 3.84 1.52 0 5.61-1.38 12.28-4.14 6.67-2.76 12.35-3.89 17.04-3.39 12.63 1.09 22.38 5.61 29.25 13.56-11.1 6.74-16.53 16-16.3 27.79.22 9.24 3.72 16.91 10.5 23.01 6.78 6.1 14.86 9.61 24.24 10.53-2.61 7.73-5.87 15.08-9.78 22.06zM119.22 33.56c0-7.39 2.66-14.28 7.98-20.67 5.32-6.39 11.97-10.42 19.95-12.09.87 7.07-1.12 13.88-5.97 20.43-4.85 6.55-11.39 10.67-19.62 12.36-.54-.03-2.34-.03-2.34-.03z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="social-btn"
                      onClick={() => handleSocialLogin("GitHub")}
                      title="Sign in with GitHub"
                      aria-label="Sign in with GitHub"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </button>
                  </div>
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
