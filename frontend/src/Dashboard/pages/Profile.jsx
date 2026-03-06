import { useEffect, useMemo, useState } from "react";
import {
  UserCircle2,
  Mail,
  ShieldCheck,
  Lock,
  Clock3,
  Bell,
  LineChart,
  Database,
  Save,
  LogOut,
  CheckCircle2,
  TriangleAlert,
  ImagePlus,
  Trash2,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";
import { authClient } from "../../lib/auth-client";

const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function passwordStrength(password) {
  if (!password) return { score: 0, label: "No password entered" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (score <= 2) return { score, label: "Weak" };
  if (score <= 4) return { score, label: "Medium" };
  return { score, label: "Strong" };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

async function compressAvatar(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(rawDataUrl);

  const maxSide = 320;
  const ratio = Math.min(maxSide / image.width, maxSide / image.height, 1);
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is unavailable");

  ctx.drawImage(image, 0, 0, width, height);

  const preferred = canvas.toDataURL("image/webp", 0.85);
  if (preferred.startsWith("data:image/webp")) {
    return preferred;
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

/* ─── Tiny reusable helpers ─────────────────────────────────── */

function SectionCard({
  title,
  icon: Icon,
  iconColor = "text-amber-400",
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/15 bg-[#111111] overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-amber-500/15 bg-white/[0.02]">
        {Icon && (
          <span
            className={cn(
              "p-1.5 rounded-md bg-white/5 border border-white/10",
              iconColor,
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldInput({
  label,
  hint,
  icon: Icon,
  type = "text",
  showToggle,
  ...props
}) {
  const [show, setShow] = useState(false);
  const inputType = showToggle ? (show ? "text" : "password") : type;
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-gray-400">{label}</p>}
      <div className="relative">
        {Icon && (
          <Icon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        )}
        <input
          {...props}
          type={inputType}
          className={cn(
            "w-full rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-gray-600",
            "px-3 py-2 focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            Icon ? "pl-9" : "pl-3",
            showToggle ? "pr-9" : "pr-3",
          )}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {show ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-600">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  icon: Icon,
  value,
  disabled,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-amber-500/10 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="p-1.5 rounded-md bg-white/5 border border-white/8 shrink-0">
            <Icon className="w-3.5 h-3.5 text-amber-400" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border",
            value
              ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
              : "text-gray-500 border-white/10 bg-white/5",
          )}
        >
          {value ? "On" : "Off"}
        </span>
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-white/20 border border-white/20"
        />
      </div>
    </div>
  );
}

/* ─── Strength bar ───────────────────────────────────────────── */
function StrengthBar({ score }) {
  const colors = [
    "bg-red-500",
    "bg-red-400",
    "bg-amber-400",
    "bg-amber-300",
    "bg-emerald-400",
  ];
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= score ? colors[i - 1] : "bg-white/10",
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-[11px] font-medium",
          score <= 1
            ? "text-red-400"
            : score <= 2
              ? "text-amber-400"
              : score <= 3
                ? "text-amber-300"
                : "text-emerald-400",
        )}
      >
        {labels[score] || ""}
      </p>
    </div>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const {
    user,
    updateProfile,
    updatePreferences,
    updateAvatar,
    refreshUser,
    logout,
  } = useAuth();

  const [profileForm, setProfileForm] = useState({ username: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    liveDashboard: true,
    compactTables: false,
  });
  const [preferencesSavingKey, setPreferencesSavingKey] = useState("");
  const [preferencesError, setPreferencesError] = useState("");

  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "delete") return;
    setDeleteLoading(true);
    setDeleteError("");
    const { error } = await authClient.deleteUser();
    if (error) {
      setDeleteError(
        error.message || "Failed to delete account. Please try again.",
      );
      setDeleteLoading(false);
      return;
    }
    await logout();
    navigate("/login", { replace: true });
  };

  const strength = useMemo(
    () => passwordStrength(passwordForm.newPassword),
    [passwordForm.newPassword],
  );

  useEffect(() => {
    refreshUser().catch(() => {
      // Ignore background refresh failures on page mount.
    });
  }, [refreshUser]);

  useEffect(() => {
    setProfileForm({
      username: user?.username || "",
      email: user?.email || "",
    });

    setPreferences({
      emailAlerts:
        typeof user?.preferences?.emailAlerts === "boolean"
          ? user.preferences.emailAlerts
          : true,
      liveDashboard:
        typeof user?.preferences?.liveDashboard === "boolean"
          ? user.preferences.liveDashboard
          : true,
      compactTables:
        typeof user?.preferences?.compactTables === "boolean"
          ? user.preferences.compactTables
          : false,
    });

    setAvatarPreview(user?.avatarDataUrl || "");
  }, [user]);

  const lastLoginText = user?.lastLogin
    ? new Date(user.lastLogin).toLocaleString()
    : "No recent login";

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");

    const payload = {
      username: profileForm.username.trim(),
      email: profileForm.email.trim(),
    };

    if (!payload.username || !payload.email) {
      setProfileError("Username and email are required.");
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile(payload);
      setProfileMessage("Profile details updated successfully.");
    } catch (err) {
      setProfileError(
        err?.response?.data?.error || "Unable to update profile details.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setPasswordError(
        err?.response?.data?.error || "Unable to change password.",
      );
    } finally {
      setPasswordSaving(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const togglePreference = async (key) => {
    setPreferencesError("");

    const next = {
      ...preferences,
      [key]: !preferences[key],
    };

    setPreferences(next);
    setPreferencesSavingKey(key);

    try {
      await updatePreferences({ [key]: next[key] });
    } catch (err) {
      setPreferences((prev) => ({ ...prev, [key]: !next[key] }));
      setPreferencesError(
        err?.response?.data?.error || "Unable to save preference.",
      );
    } finally {
      setPreferencesSavingKey("");
    }
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setAvatarError("Only PNG, JPEG, and WEBP images are supported.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setAvatarError("Image must be 2MB or smaller before upload.");
      return;
    }

    setAvatarError("");
    setAvatarUploading(true);

    try {
      const avatarDataUrl = await compressAvatar(file);
      setAvatarPreview(avatarDataUrl);
      await updateAvatar({ avatarDataUrl });
    } catch (err) {
      setAvatarError(
        err?.response?.data?.error || err.message || "Unable to upload avatar.",
      );
      setAvatarPreview(user?.avatarDataUrl || "");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError("");
    setAvatarUploading(true);

    try {
      await updateAvatar({ clear: true });
      setAvatarPreview("");
    } catch (err) {
      setAvatarError(err?.response?.data?.error || "Unable to remove avatar.");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/15 bg-[#0f0f0f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.1),transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 p-6 md:p-8">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="avatar"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white/20 shadow-xl shadow-amber-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20 border-2 border-white/20">
                <UserCircle2 className="w-12 h-12 text-black" />
              </div>
            )}
            <label
              className={cn(
                "absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-[#1a1a1a] border border-white/15",
                "cursor-pointer hover:bg-white/10 transition-colors",
                avatarUploading && "pointer-events-none opacity-50",
              )}
            >
              {avatarUploading ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
                disabled={avatarUploading}
              />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">
              {user?.username || "Profile"}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5 truncate">
              {user?.email || ""}
            </p>
            {avatarError && (
              <p className="text-xs text-red-400 mt-1">{avatarError}</p>
            )}
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
                className="mt-2 text-xs text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                Remove avatar
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex sm:flex-col gap-3 sm:gap-2 shrink-0">
            <div className="px-4 py-2.5 rounded-lg border border-amber-500/15 bg-black/30 text-center min-w-[90px]">
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Role</p>
              <p className="text-sm font-bold text-amber-300 uppercase">
                {user?.role || "viewer"}
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-lg border border-amber-500/15 bg-black/30 text-center min-w-[90px]">
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">
                Status
              </p>
              <p className="text-sm font-bold text-emerald-300">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="xl:col-span-7 space-y-5">
          {/* Identity */}
          <SectionCard title="Identity" icon={UserCircle2}>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldInput
                  label="Username"
                  icon={UserCircle2}
                  value={profileForm.username}
                  placeholder="your-username"
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, username: e.target.value }))
                  }
                />
                <FieldInput
                  label="Email"
                  type="email"
                  icon={Mail}
                  value={profileForm.email}
                  placeholder="name@company.com"
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>

              {(profileError || profileMessage) && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-xs px-3 py-2 rounded-lg border",
                    profileError
                      ? "text-red-400 bg-red-500/8 border-red-500/20"
                      : "text-emerald-400 bg-emerald-500/8 border-emerald-500/20",
                  )}
                >
                  {profileError ? (
                    <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {profileError || profileMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={profileSaving}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-5"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                {profileSaving ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          </SectionCard>

          {/* Preferences */}
          <SectionCard title="Preferences" icon={Bell}>
            <div>
              <ToggleRow
                label="Email Alerts"
                description="Incidents and degradation notifications by email."
                icon={Bell}
                value={preferences.emailAlerts}
                disabled={preferencesSavingKey === "emailAlerts"}
                onChange={() => togglePreference("emailAlerts")}
              />
              <ToggleRow
                label="Live Dashboard"
                description="Real-time traffic and event streams."
                icon={LineChart}
                value={preferences.liveDashboard}
                disabled={preferencesSavingKey === "liveDashboard"}
                onChange={() => togglePreference("liveDashboard")}
              />
              <ToggleRow
                label="Compact Tables"
                description="Tighter row spacing in logs and analytics."
                icon={Database}
                value={preferences.compactTables}
                disabled={preferencesSavingKey === "compactTables"}
                onChange={() => togglePreference("compactTables")}
              />
            </div>
            {preferencesError && (
              <p className="text-xs text-red-400 mt-3">{preferencesError}</p>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="xl:col-span-5 space-y-5">
          {/* Security */}
          <SectionCard title="Change Password" icon={KeyRound}>
            {/* Auth status banner */}
            <div className="flex items-start gap-2.5 mb-4 px-3 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/8">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">
                  Token-based auth active
                </p>
                <p className="text-[11px] text-emerald-300/60 mt-0.5">
                  JWT + API-key auth on all protected routes.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-3">
              <FieldInput
                label="Current Password"
                icon={Lock}
                showToggle
                value={passwordForm.currentPassword}
                placeholder="••••••••"
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    currentPassword: e.target.value,
                  }))
                }
              />
              <FieldInput
                label="New Password"
                icon={Lock}
                showToggle
                value={passwordForm.newPassword}
                placeholder="••••••••"
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    newPassword: e.target.value,
                  }))
                }
              />
              <FieldInput
                label="Confirm Password"
                icon={Lock}
                showToggle
                value={passwordForm.confirmPassword}
                placeholder="••••••••"
                onChange={(e) =>
                  setPasswordForm((p) => ({
                    ...p,
                    confirmPassword: e.target.value,
                  }))
                }
              />

              {passwordForm.newPassword && (
                <div className="pt-1">
                  <p className="text-[11px] text-gray-500 mb-1.5">
                    Password strength
                  </p>
                  <StrengthBar score={strength.score} />
                </div>
              )}

              {passwordError && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border text-red-400 bg-red-500/8 border-red-500/20">
                  <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                  {passwordError}
                </div>
              )}

              <Button
                type="submit"
                disabled={passwordSaving}
                className="w-full bg-white/5 border border-white/15 hover:bg-white/10 text-white font-medium text-sm"
              >
                <Lock className="w-3.5 h-3.5 mr-2" />
                {passwordSaving ? "Updating…" : "Update Password"}
              </Button>
            </form>
          </SectionCard>

          {/* Session */}
          <SectionCard title="Session" icon={Clock3} iconColor="text-sky-400">
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/4 border border-amber-500/15">
                <Clock3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white">
                    Last authenticated
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {lastLoginText}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/4 border border-amber-500/15">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-white">
                    Active protection
                  </p>
                  <p className="text-[11px] text-gray-500">
                    JWT revocation and refresh active.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
              className="w-full bg-red-500/8 border border-red-500/30 text-red-300 hover:bg-red-500/15 hover:text-red-200 text-sm"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </Button>
          </SectionCard>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-500/25 bg-[#111111] overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-red-500/15 bg-red-500/5">
              <span className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </span>
              <span className="text-sm font-semibold text-red-400">
                Danger Zone
              </span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-300 font-medium">
                Delete account permanently
              </p>
              <p className="text-xs text-gray-500">
                Immediately removes your account, all API keys, and all
                associated data. This cannot be undone.
              </p>

              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-500">
                  Type{" "}
                  <span className="font-mono text-red-400 font-semibold">
                    delete
                  </span>{" "}
                  to confirm
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => {
                    setDeleteConfirm(e.target.value);
                    setDeleteError("");
                  }}
                  placeholder="delete"
                  disabled={deleteLoading}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 disabled:opacity-50"
                />
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border text-red-400 bg-red-500/8 border-red-500/20">
                  <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                  {deleteError}
                </div>
              )}

              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "delete" || deleteLoading}
                className="w-full bg-red-600/15 border border-red-500/35 text-red-300 hover:bg-red-600/25 hover:text-red-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete My Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
