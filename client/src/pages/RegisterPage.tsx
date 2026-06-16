/**
 * REGISTER PAGE — creates an account, immediately logs you in (server returns a
 * token on register too). Validates with the shared `registerSchema`.
 */
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errMessage } from "../lib/api";
import { registerSchema } from "@shared/schemas";
import { AuthShell } from "./AuthShell";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = registerSchema.safeParse({ displayName, email, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setBusy(true);
    try {
      await register(parsed.data);
    } catch (err) {
      setError(errMessage(err, "Could not sign up"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start cooking in seconds — it's free.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Your name</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Cook" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
