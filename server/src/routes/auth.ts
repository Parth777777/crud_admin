/**
 * AUTH ROUTES  (public — no token required)
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me        (this one DOES require a token)
 */
import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, verifyPassword, signToken, requireAuth } from "../auth.js";
import { parse } from "../util.js";
import { registerSchema, loginSchema } from "@shared/schemas";

export const authRouter = Router();

// Emails that should always be admins (comma-separated in the .env file).
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Shape a DB user row into the safe object we send to the client (NO password!).
function publicUser(row: any) {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

authRouter.post("/register", (req, res) => {
  const body = parse(registerSchema, req.body, res);
  if (!body) return;

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(body.email);
  if (exists) return res.status(409).json({ error: "That email is already registered" });

  // Decide the role: the very FIRST user to register becomes the admin, as does
  // anyone whose email is listed in ADMIN_EMAILS. Everyone else is a normal user.
  const userCount = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  const isAdmin = userCount === 0 || ADMIN_EMAILS.includes(body.email.toLowerCase());
  const role = isAdmin ? "admin" : "user";

  const info = db
    .prepare("INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)")
    .run(body.email, hashPassword(body.password), body.displayName, role);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as any;
  const token = signToken({ sub: user.id, email: user.email });
  res.status(201).json({ token, user: publicUser(user) });
});

authRouter.post("/login", (req, res) => {
  const body = parse(loginSchema, req.body, res);
  if (!body) return;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(body.email) as any;
  // Use the SAME error message whether the email or the password was wrong,
  // so attackers can't tell which emails are registered.
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ sub: user.id, email: user.email });
  res.json({ token, user: publicUser(user) });
});

// Returns the current user based on the token — used by the client on page
// load to restore the session ("am I still logged in?").
authRouter.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.sub) as any;
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});
