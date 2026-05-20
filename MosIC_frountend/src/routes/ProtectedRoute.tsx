import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

/**
 * Wrap any route that requires a valid JWT.
 *
 * Usage in App.tsx / router:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Home />} />
 *     <Route path="/files"     element={<FileIndexPage />} />
 *   </Route>
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While rehydrating from localStorage, render nothing to avoid flash
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
