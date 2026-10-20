import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
} from "lucide-react";

type ResetPasswordSearch = {
  token?: string;
  email?: string;
};

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset Your Password | RIOTOUS" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
      {
        name: "description",
        content: "Secure password recovery for your RIOTOUS customer account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const token = search?.token?.trim();
  const initialEmail = search?.email?.trim() || "";

  const { resetPasswordWithToken, requestPasswordReset } = useAuth();

  // State for token-based password reset form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State for request link form (if no token)
  const [email, setEmail] = useState(initialEmail);
  const [requestSent, setRequestSent] = useState(false);

  // General state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isLengthValid = newPassword.length >= 6;

  // Handle Token Password Reset Submission
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!token) {
      setErrorMsg("Missing password recovery token. Please request a new link.");
      return;
    }

    if (!isLengthValid) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify and re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithToken(token, newPassword, confirmPassword);
      if (!res.ok) {
        setErrorMsg(res.error || "Password reset failed. The link may have expired.");
        toast.error(res.error || "Password reset failed");
        return;
      }

      setSuccess(true);
      toast.success("Password updated successfully! Welcome back.");
      setTimeout(() => {
        navigate({ to: "/auth", search: { mode: "signin" } });
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Handle Requesting Reset Link (No token present)
  async function handleRequestLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(email.trim());
      if (!res.ok && res.code === 429) {
        setErrorMsg(res.error || "Too many recovery requests. Please wait a few minutes.");
        toast.error(res.error || "Too many requests");
        return;
      }

      setRequestSent(true);
      toast.success("Recovery instructions sent to your email.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request password reset";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-16 bg-neutral-950 text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-900/60 via-neutral-950 to-neutral-950 -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        {/* Top Brand Tag */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800/80">
          <Link
            to="/"
            className="text-lg font-black tracking-widest uppercase hover:opacity-80 transition-opacity"
          >
            RI<span className="text-red-500">O</span>T<span className="text-red-500">O</span>US
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Encrypted Session</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CASE 1: SUCCESSFUL RESET SCREEN                          */}
        {/* ======================================================== */}
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Password Updated</h1>
            <p className="text-sm text-neutral-400">
              Your password has been securely updated. A confirmation notice has been sent to your
              email.
            </p>
            <div className="pt-4">
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white text-black font-semibold py-3 px-4 text-sm hover:bg-neutral-200 transition-colors"
              >
                Continue to Sign In
              </Link>
            </div>
          </div>
        ) : token ? (
          /* ======================================================== */
          /* CASE 2: HAS RESET TOKEN -> SET NEW PASSWORD FORM         */
          /* ======================================================== */
          <div>
            <div className="space-y-1.5 mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Account Recovery</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Create New Password</h1>
              <p className="text-xs text-neutral-400">
                Choose a strong password to protect your RIOTOUS customer account.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{errorMsg}</p>
                  {errorMsg.toLowerCase().includes("expired") ||
                  errorMsg.toLowerCase().includes("invalid") ? (
                    <Link
                      to="/reset-password"
                      className="text-xs font-medium text-white underline hover:no-underline block pt-1"
                    >
                      Request a new recovery link →
                    </Link>
                  ) : null}
                </div>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/80 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/80 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password criteria pills */}
              <div className="flex items-center gap-3 py-1 text-xs text-neutral-400">
                <span className={isLengthValid ? "text-emerald-400 font-medium" : ""}>
                  ✓ Min 6 characters
                </span>
                <span className={passwordsMatch ? "text-emerald-400 font-medium" : ""}>
                  {passwordsMatch ? "✓ Passwords match" : "• Passwords must match"}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !isLengthValid || !passwordsMatch}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          </div>
        ) : (
          /* ======================================================== */
          /* CASE 3: NO TOKEN -> REQUEST RESET LINK FORM              */
          /* ======================================================== */
          <div>
            <div className="space-y-1.5 mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                <Mail className="h-3.5 w-3.5" />
                <span>Password Recovery</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
              <p className="text-xs text-neutral-400">
                Enter your account email to receive a secure recovery link.
              </p>
            </div>

            {requestSent ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Recovery Instructions Dispatched</span>
                  </div>
                  <p>
                    If an account is registered for <strong className="text-white">{email}</strong>
                    , we've sent instructions with a secure single-use recovery link.
                  </p>
                  <p className="text-neutral-400">
                    The link will expire in 20 minutes for security reasons. Remember to check your
                    spam or promotions folder.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestSent(false);
                      setErrorMsg(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-white underline text-center"
                  >
                    Try a different email address
                  </button>
                  <Link
                    to="/auth"
                    search={{ mode: "signin" }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2.5 px-4 text-xs transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestLinkSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/80 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Send Recovery Link</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    to="/auth"
                    search={{ mode: "signin" }}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
