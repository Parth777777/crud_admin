/**
 * PROTECTED ROUTE
 * ---------------
 * Wraps any screen that requires login. If there's no user, it redirects to
 * /login (remembering where you were headed). This is the CLIENT-side guard;
 * the real security is on the SERVER (the JWT middleware). The client guard is
 * just for a nice UX — you should never rely on it for security.
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center text-slate-400">
        <div className="animate-pulse text-lg">Loading Foodly…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
