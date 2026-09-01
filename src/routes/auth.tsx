import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isAdminEmail } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { BrandName } from "@/components/brand-name";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In · RIOTOUS" },
      {
        name: "description",
        content: "Sign in or create your RIOTOUS account to shop, save designs and track orders.",
      },
      { property: "og:title", content: "Sign In · RIOTOUS" },
      {
        property: "og:description",
        content: "Sign in or create your RIOTOUS account to shop, save designs and track orders.",
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
    signUp,
    sendOtp,
    verifyAndRegister,
    verifyAndResetPassword,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      if (search?.redirect) {
        navigate({ to: search.redirect as any });
      } else if (user.role === "admin" || isAdminEmail(user.email)) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    }
  }, [user, authLoading, navigate, search?.redirect]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (!res.ok) {
        toast.error(res.error || "Invalid email or password.");
        return;
      }
      toast.success("Welcome back.");
      const isAdmin = res.session?.user?.role === "admin" || isAdminEmail(res.session?.user?.email);
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
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(email, "signup");
      if (!res.ok) {
        toast.error(res.error || "Failed to send verification code.");
        return;
      }
      toast.success(`Verification code sent to ${email}`);
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
    setLoading(true);
    try {
      const res = await verifyAndRegister(email, password, fullName, otp.trim());
      if (!res.ok) {
        toast.error(res.error || "Verification failed");
        return;
      }
      toast.success("Account verified and created successfully. Welcome!");
      const isAdmin = res.session?.user?.role === "admin" || isAdminEmail(res.session?.user?.email);
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
      toast.success(`Password reset code sent to ${email}`);
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
      const res = await verifyAndResetPassword(email, otp.trim(), newPassword);
      if (!res.ok) {
        toast.error(res.error || "Password reset failed");
        return;
      }
      toast.success("Password reset successfully! You are now signed in.");
      const isAdmin = res.session?.user?.role === "admin" || isAdminEmail(res.session?.user?.email);
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
    <div className="container flex min-h-[calc(100vh-140px)] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight">
            <BrandName />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" && "Sign in to your account"}
            {mode === "signup" && "Create a new account"}
            {mode === "signup_verify" && "Verify your email address"}
            {mode === "forgot" && "Reset your password"}
            {mode === "forgot_verify" && "Enter verification code & new password"}
          </p>
        </div>

        {/* SIGN IN FORM */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs font-medium text-primary hover:underline"
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
                  className="w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === "signup" && (
          <form onSubmit={handleRequestSignupOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
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
                  className="w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Verification Code"}
            </button>
          </form>
        )}

        {/* SIGN UP OTP VERIFY FORM */}
        {mode === "signup_verify" && (
          <form onSubmit={handleVerifyAndSignup} className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
              We have sent a 6-digit verification code to{" "}
              <span className="font-semibold text-foreground">{email}</span>. Please enter it below.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full rounded-lg border bg-background px-4 py-3 text-center text-2xl font-mono tracking-widest outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Create Account"}
            </button>

            <div className="flex justify-between items-center text-xs pt-2">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
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
                className="text-primary font-medium hover:underline"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD REQUEST FORM */}
        {mode === "forgot" && (
          <form onSubmit={handleRequestForgotOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Account Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Code"}
            </button>

            <button
              type="button"
              onClick={() => setMode("signin")}
              className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground pt-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD VERIFY & RESET FORM */}
        {mode === "forgot_verify" && (
          <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
              We have sent a 6-digit password reset code to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                6-Digit Reset Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full rounded-lg border bg-background px-4 py-3 text-center text-2xl font-mono tracking-widest outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
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
                  className="w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Reset Password"}
            </button>

            <div className="flex justify-between items-center text-xs pt-2">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
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
                className="text-primary font-medium hover:underline"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* BOTTOM MODE SWITCHERS */}
        {(mode === "signin" || mode === "signup") && (
          <div className="text-center text-sm pt-2 border-t">
            {mode === "signin" ? (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
