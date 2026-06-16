/**
 * AUTHENTICATION with JWT (JSON Web Tokens)
 * -----------------------------------------
 * A JWT is a signed string that proves "I am user #5" without the server
 * having to remember anything (no session storage). It has 3 parts:
 *
 *     header.payload.signature
 *
 *   - payload: public data we put in, e.g. { sub: 5, email: "a@b.com" }
 *   - signature: a fingerprint created with our SECRET. Anyone can READ the
 *     payload (it's just base64), but nobody can FORGE one without the secret.
 *
 * Flow:
 *   1. User logs in with email + password.
 *   2. We check the password against the stored bcrypt hash.
 *   3. If valid, we `sign()` a token and send it to the browser.
 *   4. On every later request, the browser sends it back in the header:
 *          Authorization: Bearer <token>
 *   5. Our `requireAuth` middleware `verify()`s it and attaches `req.user`.
 *
 * Passwords are NEVER stored in plain text. We store a bcrypt HASH, which is
 * a one-way function — you can check a password against it, but you can't
 * reverse it back into the original password.
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// What we store inside the token.
export interface JwtPayload {
  sub: number; // the user's id ("subject")
  email: string;
}

// We add `user` to Express's Request so route handlers can read `req.user`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function hashPassword(plain: string): string {
  // The "10" is the cost factor: higher = slower = harder to brute force.
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Express MIDDLEWARE. Middleware is just a function that runs BEFORE your
 * route handler. This one guards protected routes: it reads the token,
 * verifies it, and either lets the request through (calling `next()`) or
 * rejects it with 401 Unauthorized.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { sub: decoded.sub, email: decoded.email };
    next(); // token is valid -> continue to the actual route handler
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Admin-only guard. Run it AFTER requireAuth. We re-read the user's role from
 * the database (rather than trusting the token) so that revoking admin takes
 * effect immediately, without waiting for the token to expire.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user!.sub) as
    | { role: string }
    | undefined;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}
