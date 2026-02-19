import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Zap, Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setFormError("Email and password are required");
      return;
    }
    const result = await login(form.email, form.password);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setFormError(result.error || "Invalid credentials");
    }
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
          <a href="/" className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold text-white">Gatekeeper</span>
          </a>
          <h1 className="text-xl font-semibold text-white">
            Sign in to dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Enter your credentials to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-300"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@gateway.local"
                  disabled={loading}
                  className={cn(
                    "w-full bg-white/5 border rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition-all duration-200",
                    formError
                      ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                      : "border-white/10 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20",
                    "disabled:opacity-50",
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  className={cn(
                    "w-full bg-white/5 border rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none transition-all duration-200",
                    formError
                      ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                      : "border-white/10 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20",
                    "disabled:opacity-50",
                  )}
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

            {/* Error message */}
            {formError && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{formError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                "bg-gradient-to-r from-amber-500 to-orange-500 text-black",
                "hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/25",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none",
                "focus:outline-none focus:ring-2 focus:ring-amber-500/50",
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Default admin:{" "}
          <span className="text-gray-400 font-mono">admin@gateway.local</span>
        </p>
      </div>
    </div>
  );
}
