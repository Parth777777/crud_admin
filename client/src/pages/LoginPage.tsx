/**
 * LOGIN PAGE
 * Demonstrates the client side of the JWT flow + shared zod validation:
 * we validate the form with the SAME `loginSchema` the server uses, then call
 * `login()` which stores the returned token.
 */
import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errMessage } from "../lib/api";
import { loginSchema } from "@shared/schemas";
import { AuthShell } from "./AuthShell";

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    // CLIENT-side validation (instant feedback). The server validates again.
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setBusy(true);
    try {
      await login(parsed.data);
    } catch (err) {
      setError(errMessage(err, "Could not log in"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Foodly kitchen.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{" "}
        <Link to="/register" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
