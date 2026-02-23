import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { api } from "../utils/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "gk_access_token";
const REFRESH_TOKEN_KEY = "gk_refresh_token";
const USER_KEY = "gk_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep axios client in sync whenever token changes
  useEffect(() => {
    api.setToken(token);
  }, [token]);

  useEffect(() => {
    api.setRefreshToken(localStorage.getItem(REFRESH_TOKEN_KEY));
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login({ email, password });
      const { accessToken, refreshToken, user: me } = data;
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
      setToken(accessToken);
      api.setRefreshToken(refreshToken || null);
      setUser(me);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || "Login failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // If server-side logout fails, still clear local state
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      api.setToken(null);
      api.setRefreshToken(null);
      setToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.getMe();
    localStorage.setItem(USER_KEY, JSON.stringify(me));
    setUser(me);
    return me;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const updated = await api.updateProfile(payload);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
    return updated;
  }, []);

  const updatePreferences = useCallback(async (payload) => {
    const updated = await api.updatePreferences(payload);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
    return updated;
  }, []);

  const updateAvatar = useCallback(async (payload) => {
    const updated = await api.updateAvatar(payload);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
    return updated;
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
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
