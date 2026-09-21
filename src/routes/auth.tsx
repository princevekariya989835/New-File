import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminPanelAccess } from "@/lib/auth";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Shirt,
  Truck,
  Gift,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign Up & Sign In | RIOTOUS Streetwear Official" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Sign up or sign in to your RIOTOUS account to shop, save custom designs and track orders.",
      },
      { property: "og:title", content: "Sign Up & Sign In | RIOTOUS Streetwear Official" },
      {
        property: "og:description",
        content: "Sign up or sign in to your RIOTOUS account to shop, save custom designs and track orders.",
      },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "signin" | "signup" | "signup_verify" | "forgot" | "forgot_verify";

function AuthPage() {
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
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  useEffect(() => {
    if (user && !authLoading) {
      if (search?.redirect) {
        navigate({ to: search.redirect as any });
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
      toast.success("Welcome back.");
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
      toast.success("Account verified and created successfully. Welcome!");
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

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center bg-neutral-950 overflow-x-hidden">
      {/* Studio Background Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/assets/auth-bg.jpg')" }}
      >
        {/* Soft dark vignette & gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[980px] px-4 py-24 sm:px-6 md:py-28 lg:px-8">
        <div className="w-full rounded-[28px] sm:rounded-[36px] bg-white text-neutral-900 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.65),0_0_60px_rgba(230,0,0,0.12)] border border-white/70 p-6 sm:p-8 md:p-10 lg:p-12 transition-all duration-300">
          {/* Card Header Title */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight text-neutral-900">
              {mode === "signup" && (
                <>
                  Sign Up for{" "}
                  <span className="font-black tracking-wider">
                    RI<span className="text-brand-red">O</span>T<span className="text-brand-red">O</span>US
                  </span>
                </>
              )}
              {mode === "signup_verify" && (
                <>
                  Verify Your{" "}
                  <span className="font-black tracking-wider">
                    RI<span className="text-brand-red">O</span>T<span className="text-brand-red">O</span>US
                  </span>{" "}
                  Account
                </>
              )}
              {mode === "signin" && (
                <>
                  Sign In to{" "}
                  <span className="font-black tracking-wider">
                    RI<span className="text-brand-red">O</span>T<span className="text-brand-red">O</span>US
                  </span>
                </>
              )}
              {mode === "forgot" && "Reset Your Password"}
              {mode === "forgot_verify" && "Set New Password"}
            </h1>
          </div>

          {/* Two Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Form Content */}
            <div className="lg:col-span-7">
              {/* SIGN UP FORM */}
              {mode === "signup" && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
                    CREATE YOUR ACCOUNT
                  </div>

                  <form onSubmit={handleRequestSignupOtp} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="terms-agree"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                      />
                      <label htmlFor="terms-agree" className="text-xs text-neutral-600 leading-snug cursor-pointer select-none">
                        I agree to the{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-brand-red"
                        >
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-brand-red"
                        >
                          Privacy Policy
                        </a>
                        .
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold py-3 px-4 text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                    </button>

                    {/* Already have account */}
                    <div className="text-center text-xs text-neutral-600 pt-1">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={(e) => handleSwitchMode("signin", e)}
                        className="font-semibold text-neutral-950 underline underline-offset-2 hover:text-brand-red transition-colors cursor-pointer"
                      >
                        Login Now!
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SIGN UP OTP VERIFY FORM */}
              {mode === "signup_verify" && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
                    VERIFY YOUR EMAIL
                  </div>

                  <form onSubmit={handleVerifyAndSignup} className="space-y-4">
                    <div className="rounded-xl bg-neutral-100/80 p-4 text-center text-xs text-neutral-600 leading-relaxed border border-neutral-200/60">
                      We sent a 6-digit verification code to{" "}
                      <span className="font-semibold text-neutral-900 block mt-0.5">{email}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5 text-center">
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-center text-2xl font-mono tracking-widest text-neutral-900 outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold py-3 px-4 text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Create Account"}
                    </button>

                    <div className="flex justify-between items-center text-xs pt-2">
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to details
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
                        className="text-neutral-900 font-semibold hover:underline hover:text-brand-red transition-colors"
                      >
                        Resend Code
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SIGN IN FORM */}
              {mode === "signin" && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
                    LOG IN TO YOUR ACCOUNT
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={(e) => handleSwitchMode("forgot", e)}
                          className="text-xs font-medium text-neutral-600 hover:text-brand-red hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold py-3 px-4 text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                    </button>

                    <div className="text-center text-xs text-neutral-600 pt-1">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={(e) => handleSwitchMode("signup", e)}
                        className="font-semibold text-neutral-950 underline underline-offset-2 hover:text-brand-red transition-colors cursor-pointer"
                      >
                        Sign Up Now!
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* FORGOT PASSWORD REQUEST FORM */}
              {mode === "forgot" && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
                    FORGOT PASSWORD
                  </div>

                  <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Account Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold py-3 px-4 text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Code"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleSwitchMode("signin", e)}
                      className="flex w-full items-center justify-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 pt-1 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                    </button>
                  </form>
                </div>
              )}

              {/* FORGOT PASSWORD VERIFY & RESET FORM */}
              {mode === "forgot_verify" && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
                    SET NEW PASSWORD
                  </div>

                  <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                    <div className="rounded-xl bg-neutral-100/80 p-4 text-center text-xs text-neutral-600 leading-relaxed border border-neutral-200/60">
                      We sent a 6-digit password reset code to{" "}
                      <span className="font-semibold text-neutral-900 block mt-0.5">{email}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 text-center">
                        6-Digit Reset Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-center text-2xl font-mono tracking-widest text-neutral-900 outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-semibold py-3 px-4 text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Reset Password"}
                    </button>

                    <div className="flex justify-between items-center text-xs pt-2">
                      <button
                        type="button"
                        onClick={(e) => handleSwitchMode("forgot", e)}
                        className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to email
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true);
                          const res = await sendOtp(email, "forgot_password");
                          setLoading(false);
                          if (res.ok) toast.success("New reset code sent!");
                          else toast.error(res.error || "Failed to resend code");
                        }}
                        className="text-neutral-900 font-semibold hover:underline hover:text-brand-red transition-colors"
                      >
                        Resend Code
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Right Column: Benefits & Dynamic Banner */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full border-t lg:border-t-0 lg:border-l border-neutral-100 lg:border-neutral-200/70 pt-6 lg:pt-0 lg:pl-8">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-neutral-600 mb-5">
                  WHY JOIN RIOTOUS?
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3.5 text-neutral-800">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 shadow-xs">
                      <Shirt className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium leading-snug">
                      Unlock Custom Design Features
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 text-neutral-800">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 shadow-xs">
                      <Truck className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium leading-snug">
                      Faster Checkout &amp; Order Tracking
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 text-neutral-800">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 shadow-xs">
                      <Gift className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium leading-snug">
                      Exclusive Member Rewards &amp; Early Access
                    </span>
                  </div>
                </div>
              </div>

              {/* Banner Card */}
              <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 shadow-md bg-neutral-950 group mt-4">
                <img
                  src="/assets/auth-banner.jpg"
                  alt="RIOTOUS - More than just clothes"
                  className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
