/**
 * ADMIN ROUTE — like ProtectedRoute, but also requires the 'admin' role.
 * Non-admins are sent back to the home page. (The server enforces this too via
 * `requireAdmin` — the client guard is only for a tidy UX.)
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { ReactNode } from "react";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center text-slate-400">
        <div className="animate-pulse text-lg">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
