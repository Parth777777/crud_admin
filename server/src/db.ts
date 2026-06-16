/**
 * THE DATABASE LAYER
 * ------------------
 * We use SQLite via `better-sqlite3`. SQLite stores the ENTIRE database in a
 * single file on disk (`foodly.db`, created next to this project). That's
 * fantastic for learning because there's no server to install — and you can
 * open the file with any SQLite viewer to literally SEE your rows change as
 * you click around the app.
 *
 * `better-sqlite3` is SYNCHRONOUS: `db.prepare(...).run()` returns immediately.
 * That keeps the teaching code simple (no async/await noise on every query).
 *
 * "Migrations" = the SQL that creates our tables. We run it once on startup
 * with `CREATE TABLE IF NOT EXISTS`, so it's safe to run every boot.
 */
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The DB file lives at server/foodly.db
const dbPath = path.join(__dirname, "..", "foodly.db");

export const db = new Database(dbPath);

// Recommended pragmas: WAL improves concurrency; foreign_keys enforces our
// relationships (e.g. you can't have an order_item pointing at a missing order).
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * Create every table. Notice how each "owned" table has a `user_id` column
 * with `ON DELETE CASCADE` — delete a user and all their data goes with them.
 * That `user_id` is also how we enforce AUTHORIZATION: every query is scoped
 * to the logged-in user's id.
 */
export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name  TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',   -- 'user' or 'admin'
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      meal_id    TEXT NOT NULL,
      meal_name  TEXT NOT NULL,
      meal_thumb TEXT NOT NULL DEFAULT '',
      note       TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, meal_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      meal_id    TEXT NOT NULL,
      rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment    TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, meal_id)
    );

    CREATE TABLE IF NOT EXISTS custom_recipes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      category     TEXT NOT NULL DEFAULT 'Misc',
      area         TEXT NOT NULL DEFAULT 'Unknown',
      instructions TEXT NOT NULL,
      image_url    TEXT NOT NULL DEFAULT '',
      ingredients  TEXT NOT NULL DEFAULT '[]',  -- JSON array of {name, measure}
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status     TEXT NOT NULL DEFAULT 'pending',
      total      REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id  INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      meal_id   TEXT NOT NULL,
      meal_name TEXT NOT NULL,
      qty       INTEGER NOT NULL DEFAULT 1,
      price     REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pantry_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ingredient TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, ingredient)
    );

    -- Admin edits to EXISTING (TheMealDB) meals. TheMealDB is read-only, so we
    -- can't change it. Instead we store an "override" keyed by the meal id and
    -- merge it on top of the live TheMealDB data whenever a meal is shown.
    CREATE TABLE IF NOT EXISTS meal_overrides (
      meal_id      TEXT PRIMARY KEY,            -- TheMealDB id, e.g. "52772"
      name         TEXT,
      category     TEXT,
      area         TEXT,
      instructions TEXT,
      image_url    TEXT,
      ingredients  TEXT,                        -- JSON array of {name, measure}
      updated_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Lightweight "alter" migration: if an OLDER foodly.db was created before the
  // `role` column existed, add it now. (CREATE TABLE above only runs for brand
  // new databases, so existing ones need this.)
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "role")) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  }
}
