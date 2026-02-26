import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Bell,
  User,
  ChevronRight,
  LogOut,
  Loader2,
  CheckCheck,
  Shield,
  KeyRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { useGatewayFilter } from "../context/GatewayFilterContext";
import { Filter } from "lucide-react";
import { api } from "../utils/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const breadcrumbMap = {
  "/dashboard": ["Dashboard", "Overview"],
  "/dashboard/analytics": ["Dashboard", "Analytics"],
  "/dashboard/logs": ["Dashboard", "Logs"],
  "/dashboard/settings": ["Dashboard", "Settings"],
  "/dashboard/profile": ["Dashboard", "Profile"],
};

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { routesOnly } = useGatewayFilter();
  const breadcrumbs = breadcrumbMap[location.pathname] || ["Dashboard"];
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileForm, setProfileForm] = useState({
    username: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName = user?.username || user?.email?.split("@")[0] || "Admin";
  const displayEmail = user?.email || "admin@gatekeeper.io";
  const avatarDataUrl = user?.avatarDataUrl || null;
  const unreadCount = useMemo(
    () => alerts.filter((alert) => !alert.isRead).length,
    [alerts],
  );

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const data = await api.getOverviewAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    setProfileForm({
      username: user?.username || "",
      email: user?.email || "",
    });
  }, [user?.username, user?.email]);

  useEffect(() => {
    if (!searchOpen) return;

    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchLoading(false);
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await api.searchDashboard(query);
        setSearchResults(Array.isArray(data?.items) ? data.items : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleOpenNotifications = async () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    setProfileOpen(false);
    if (next) await fetchAlerts();
  };

  const handleMarkRead = async (id) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        String(alert.id) === String(id) ? { ...alert, isRead: true } : alert,
      ),
    );

    try {
      await api.markAlertRead(id);
    } catch {
      fetchAlerts();
    }
  };

  const handleMarkAllRead = async () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
    try {
      await api.markAllAlertsRead();
    } catch {
      fetchAlerts();
    }
  };

  const handleSearchSelect = async (item) => {
    setSearchOpen(false);
    setSearchQuery(item.title || "");

    if (item.alertId) {
      await handleMarkRead(item.alertId);
    }

    navigate(item.route || "/dashboard");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

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
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileError(
        err?.response?.data?.error || "Failed to update profile settings.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
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
        err?.response?.data?.error || "Failed to update password.",
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

  const getResultTypeClass = (type) => {
    if (type === "alert") return "bg-red-500/10 text-red-300 border-red-500/30";
    if (type === "backend")
      return "bg-blue-500/10 text-blue-300 border-blue-500/30";
    if (type === "trace")
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  };

  return (
    <header className="h-16 bg-[#0a0a0a] border-b border-white/10 flex items-center px-6 gap-6 sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className={cn(
                  index === breadcrumbs.length - 1
                    ? "text-white font-medium"
                    : "text-gray-400",
                )}
              >
                {crumb}
              </span>
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </div>
          ))}
          {routesOnly && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <Filter className="w-2.5 h-2.5" />
              Gateway only
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-md">
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => {
              setSearchOpen(true);
              setNotificationsOpen(false);
              setProfileOpen(false);
            }}
            placeholder="Search endpoints, trace IDs, alerts..."
            className="h-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 pl-10 pr-4 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
          />

          {searchOpen && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-[#101010] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              {searchLoading ? (
                <div className="p-4 text-sm text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="p-4 text-sm text-gray-500">
                  Type at least 2 characters.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No matches found.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSearchSelect(item);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-400 truncate mt-1">
                            {item.subtitle}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-semibold px-2 py-1 rounded border",
                            getResultTypeClass(item.type),
                          )}
                        >
                          {item.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={handleOpenNotifications}
            className={cn(
              "relative p-2 rounded-lg transition-colors group",
              notificationsOpen ? "bg-white/10" : "hover:bg-white/5",
            )}
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-400 group-hover:text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-black text-[10px] rounded-full flex items-center justify-center font-semibold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-[24rem] bg-[#101010] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  <p className="text-xs text-gray-400">
                    {unreadCount} unread alerts
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleMarkAllRead}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-white/5 inline-flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </Button>
              </div>

              {alertsLoading ? (
                <div className="p-4 text-sm text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading alerts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No recent alerts.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {alerts.slice(0, 12).map((alert) => (
                    <button
                      key={alert.id}
                      onClick={async () => {
                        await handleMarkRead(alert.id);
                        navigate("/dashboard");
                        setNotificationsOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors",
                        !alert.isRead && "bg-amber-500/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">
                            {alert.message}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {alert.time}
                          </div>
                        </div>
                        {!alert.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative pl-4 border-l border-white/10" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotificationsOpen(false);
              setSearchOpen(false);
            }}
            className="flex items-center gap-3 rounded-lg hover:bg-white/5 px-2 py-1 transition-colors"
            title="Profile settings"
          >
            {avatarDataUrl ? (
              <img
                src={avatarDataUrl}
                alt={`${displayName} avatar`}
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <User className="w-4 h-4 text-black" />
              </div>
            )}
            <div className="text-sm text-left hidden md:block">
              <div className="text-white font-medium">{displayName}</div>
              <div className="text-gray-400 text-xs">{displayEmail}</div>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-[30rem] bg-[#101010] border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-4 z-50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Profile Management</h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      navigate("/dashboard/profile");
                      setProfileOpen(false);
                    }}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 text-xs"
                  >
                    Open Profile Page
                  </Button>
                  <span className="text-xs px-2 py-1 rounded border border-white/15 text-gray-300 uppercase">
                    {user?.role || "viewer"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Account
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block font-medium">
                      Username
                    </Label>
                    <Input
                      value={profileForm.username}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          username: event.target.value,
                        }))
                      }
                      className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block font-medium">Email</Label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>
                {(profileError || profileMessage) && (
                  <p
                    className={cn(
                      "text-xs",
                      profileError ? "text-red-400" : "text-green-400",
                    )}
                  >
                    {profileError || profileMessage}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="h-9 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Profile
                </Button>
              </form>

              <div className="border-t border-white/10 pt-4">
                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <KeyRound className="w-3 h-3" />
                    Password
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
                      }
                      className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                      placeholder="Current password"
                    />
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: event.target.value,
                        }))
                      }
                      className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                      placeholder="New password"
                    />
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                        }))
                      }
                      className="h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-amber-500/60 focus-visible:ring-offset-0"
                      placeholder="Confirm password"
                    />
                  </div>
                  {passwordError && (
                    <p className="text-xs text-red-400">{passwordError}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={passwordSaving}
                    className="h-9 bg-white/5 border border-white/15 hover:bg-white/10 text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {passwordSaving && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Update Password
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
          title="Sign out"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
        </button>
      </div>
    </header>
  );
}
