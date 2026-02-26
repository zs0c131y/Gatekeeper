import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Zap,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { authClient } from "../lib/auth-client";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const navigate = useNavigate();
  // Read token once at render time — no effect needed
  const token = new URLSearchParams(window.location.search).get("token");
  const invalidToken = !token;
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password) {
      setFormError("Please enter a new password");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirm) {
      setFormError("Passwords do not match");
      return;
    }

    setLoading(true);
    setFormError("");

    const { error } = await authClient.resetPassword({
      newPassword: form.password,
      token,
    });

    setLoading(false);

    if (error) {
      if (error.status === 400 || error.code === "INVALID_TOKEN") {
        setFormError(
          "This reset link is invalid or has expired. Please request a new one.",
        );
      } else {
        setFormError(
          error.message || "Something went wrong. Please try again.",
        );
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/login", { replace: true }), 2500);
  };

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-2">
              Invalid reset link
            </p>
            <p className="text-gray-400 text-sm mb-6">
              This link looks broken or incomplete. Please request a fresh
              password reset link.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-lg hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Request reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Set a new password
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Choose a strong password for your account
          </p>
        </div>

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium text-lg mb-1">
                  Password updated!
                </p>
                <p className="text-gray-400 text-sm">
                  Redirecting you to sign in…
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* New password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-300"
                >
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
                  <Input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    disabled={loading}
                    className="pl-10 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirm"
                  className="text-sm font-medium text-gray-300"
                >
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none z-10" />
                  <Input
                    id="confirm"
                    name="confirm"
                    type={showPass ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={handleChange}
                    placeholder="Re-enter new password"
                    disabled={loading}
                    className={cn(
                      "pl-10",
                      form.confirm &&
                        form.confirm !== form.password &&
                        "border-red-500/50",
                    )}
                  />
                </div>
              </div>

              {/* Error */}
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
                    Updating password…
                  </span>
                ) : (
                  "Update password"
                )}
              </Button>

              <p className="text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Request a new reset link
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
