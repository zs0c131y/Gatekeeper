import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setFormError("Please enter your email address");
      return;
    }
    setLoading(true);
    setFormError("");

    const { error } = await authClient.forgetPassword({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      // Don't leak whether the email exists — show success either way in production.
      // But surface real config errors in dev.
      if (error.status === 500) {
        setFormError("Something went wrong on our end. Please try again shortly.");
        return;
      }
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-3 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold text-white group-hover:text-amber-50 transition-colors">
              Gatekeeper
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-white">
            Reset your password
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {sent
              ? "Check your inbox"
              : "We'll send a reset link to your email"}
          </p>
        </div>

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium text-lg mb-1">
                  Check your email
                </p>
                <p className="text-gray-400 text-sm">
                  If <span className="text-white font-medium">{email}</span> is
                  registered, a password reset link will arrive shortly.
                </p>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Didn't get it? Check your spam folder or try again with a
                different address.
              </p>
              <Link
                to="/login"
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors mt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-300"
                >
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormError("");
                    }}
                    placeholder="you@example.com"
                    disabled={loading}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{formError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:from-amber-400 hover:to-orange-400 disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Sending link…
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <p className="text-center text-sm text-gray-400">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
