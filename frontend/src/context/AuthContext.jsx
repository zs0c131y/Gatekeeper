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

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login({ email, password });
      const { accessToken, user: me } = data;
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(me));
      setToken(accessToken);
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
      localStorage.removeItem(USER_KEY);
      api.setToken(null);
      setToken(null);
      setUser(null);
    }
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{ user, token, loading, error, isAuthenticated, login, logout }}
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
