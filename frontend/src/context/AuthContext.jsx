import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { authClient, signIn, signOut } from "../lib/auth-client";
import { api } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // better-auth reactive session
  const { data: sessionData, isPending: sessionLoading } =
    authClient.useSession();

  // Extended profile (username, avatar, preferences) from /api/user/me
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sessionUser = sessionData?.user ?? null;
  const isAuthenticated = !!sessionUser;

  // Fetch the full profile whenever a session becomes active
  useEffect(() => {
    if (!sessionUser) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    api
      .getMe()
      .then((me) => {
        if (!cancelled) setProfile(me);
      })
      .catch(() => {
        // Profile fetch failed — fall back to session user data only
      });

    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id]);

  // Merged user object: session data (auth source of truth) + profile extras
  const user = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.role ?? "user",
        username: profile?.username ?? sessionUser.name ?? sessionUser.email,
        lastLogin: profile?.lastLogin ?? null,
        avatarDataUrl: profile?.avatarDataUrl ?? null,
        preferences: profile?.preferences ?? {
          emailAlerts: true,
          liveDashboard: true,
          compactTables: false,
        },
      }
    : null;

  // ── Auth actions ─────────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await signIn.email({ email, password });
      if (signInError) {
        const message = signInError.message || "Invalid credentials";
        setError(message);
        return { success: false, error: message };
      }
      return { success: true };
    } catch (err) {
      const message = err?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // Ignore errors — session cleared client-side regardless
    } finally {
      setProfile(null);
    }
  }, []);

  // ── Profile / preferences / avatar ──────────────────────────────────────────

  const refreshUser = useCallback(async () => {
    const me = await api.getMe();
    setProfile(me);
    return me;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const updated = await api.updateProfile(payload);
    setProfile(updated);
    return updated;
  }, []);

  const updatePreferences = useCallback(async (payload) => {
    const updated = await api.updatePreferences(payload);
    setProfile(updated);
    return updated;
  }, []);

  const updateAvatar = useCallback(async (payload) => {
    const updated = await api.updateAvatar(payload);
    setProfile(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading || sessionLoading,
        error,
        isAuthenticated,
        login,
        logout,
        refreshUser,
        updateProfile,
        updatePreferences,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
