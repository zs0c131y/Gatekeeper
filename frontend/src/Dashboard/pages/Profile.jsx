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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/api";

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

function SettingToggle({ label, description, value, disabled, onChange, icon: Icon }) {
  return (
    <div className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 transition-colors text-left disabled:opacity-60">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-white/5 border border-white/10">
          <Icon className="w-4 h-4 text-amber-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-xs px-2 py-1 rounded border font-semibold uppercase",
            value
              ? "border-green-500/40 text-green-300 bg-green-500/10"
              : "border-white/15 text-gray-400 bg-white/5",
          )}
        >
          {value ? "On" : "Off"}
        </span>
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label={label}
          className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-white/20 border border-white/20"
        />
      </div>
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
      setAvatarError(err?.response?.data?.error || err.message || "Unable to upload avatar.");
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
      <Card className="relative overflow-hidden border-white/10 bg-[#0f0f0f]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.2),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.14),transparent_50%)]" />
        <CardContent className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile avatar"
                  className="w-16 h-16 rounded-2xl object-cover border border-white/20 shadow-lg shadow-amber-500/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <UserCircle2 className="w-8 h-8 text-black" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">Profile Center</h1>
                <p className="text-gray-300">
                  Manage account identity, security controls, and dashboard
                  preferences.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
              <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs uppercase text-gray-500">Role</p>
                <p className="text-sm font-semibold text-amber-300 uppercase">
                  {user?.role || "viewer"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs uppercase text-gray-500">Last Login</p>
                <p className="text-sm font-semibold text-white">{lastLoginText}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-xs uppercase text-gray-500">Account Status</p>
                <p className="text-sm font-semibold text-green-300">Healthy</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <Card className="bg-[#111111] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Identity & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-4 rounded-xl border border-white/10 bg-black/25 space-y-3">
                <p className="text-xs uppercase text-gray-500">Avatar</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    asChild
                    className="bg-white/5 border border-white/15 hover:bg-white/10 text-white"
                    disabled={avatarUploading}
                  >
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      {avatarUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImagePlus className="w-4 h-4" />
                      )}
                      Upload Avatar
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                        disabled={avatarUploading}
                      />
                    </label>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={avatarUploading || !avatarPreview}
                    className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
                {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="profile-username"
                      className="text-sm text-gray-400 mb-2 block font-medium"
                    >
                      Username
                    </Label>
                    <div className="relative">
                      <UserCircle2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <Input
                        id="profile-username"
                        value={profileForm.username}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            username: event.target.value,
                          }))
                        }
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                        placeholder="Enter username"
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="profile-email"
                      className="text-sm text-gray-400 mb-2 block font-medium"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <Input
                        id="profile-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>
                </div>

                {(profileError || profileMessage) && (
                  <p
                    className={cn(
                      "text-sm",
                      profileError ? "text-red-400" : "text-green-400",
                    )}
                  >
                    {profileError || profileMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-amber-500 hover:bg-amber-400 text-black"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {profileSaving ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingToggle
                label="Email Alerts"
                description="Receive incident and degradation notifications by email."
                value={preferences.emailAlerts}
                disabled={preferencesSavingKey === "emailAlerts"}
                onChange={() => togglePreference("emailAlerts")}
                icon={Bell}
              />
              <SettingToggle
                label="Live Dashboard Streaming"
                description="Keep traffic and event streams active in real-time."
                value={preferences.liveDashboard}
                disabled={preferencesSavingKey === "liveDashboard"}
                onChange={() => togglePreference("liveDashboard")}
                icon={LineChart}
              />
              <SettingToggle
                label="Compact Data Tables"
                description="Use tighter row spacing across analytics and logs tables."
                value={preferences.compactTables}
                disabled={preferencesSavingKey === "compactTables"}
                onChange={() => togglePreference("compactTables")}
                icon={Database}
              />
              {preferencesError && (
                <p className="text-xs text-red-400">{preferencesError}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Card className="bg-[#111111] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-300 mt-0.5" />
                <div>
                  <p className="text-sm text-green-200 font-semibold">
                    Token-based access enabled
                  </p>
                  <p className="text-xs text-green-300/80">
                    JWT and API-key auth are active for protected routes.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-3">
                <Label
                  htmlFor="current-password"
                  className="text-sm text-gray-400 block"
                >
                  Current Password
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                />

                <Label
                  htmlFor="new-password"
                  className="text-sm text-gray-400 block"
                >
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                />

                <Label
                  htmlFor="confirm-password"
                  className="text-sm text-gray-400 block"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="bg-white/5 border-white/10 text-white focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Strength</span>
                    <span
                      className={cn(
                        strength.score <= 2 && "text-red-300",
                        strength.score > 2 &&
                          strength.score <= 4 &&
                          "text-amber-300",
                        strength.score > 4 && "text-green-300",
                      )}
                    >
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        strength.score <= 2 && "bg-red-500",
                        strength.score > 2 &&
                          strength.score <= 4 &&
                          "bg-amber-500",
                        strength.score > 4 && "bg-green-500",
                      )}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="p-2 rounded border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-red-300 text-xs">
                    <TriangleAlert className="w-3 h-3" />
                    {passwordError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={passwordSaving}
                  className="w-full bg-white/5 border border-white/15 hover:bg-white/10 text-white"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {passwordSaving ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Session Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Clock3 className="w-4 h-4 text-amber-300" />
                <div>
                  <p className="text-sm text-white font-medium">Last authenticated</p>
                  <p className="text-xs text-gray-400">{lastLoginText}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <ShieldCheck className="w-4 h-4 text-green-300" />
                <div>
                  <p className="text-sm text-white font-medium">Active protection</p>
                  <p className="text-xs text-gray-400">JWT revocation and refresh policies active.</p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  await logout();
                  navigate("/login", { replace: true });
                }}
                className="w-full bg-red-500/10 border border-red-500/40 text-red-200 hover:bg-red-500/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out Of This Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
