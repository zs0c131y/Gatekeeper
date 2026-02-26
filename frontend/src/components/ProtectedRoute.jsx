import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route that requires authentication.
 *
 * Shows nothing while the better-auth session is being verified on first load
 * (avoids a flash-redirect to /login for already-authenticated users).
 * Redirects to /login when the session check is complete and the user is
 * not authenticated, preserving the intended destination for post-login redirect.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Still checking the session — suspend render without redirecting
  if (loading && !isAuthenticated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
