/**
 * ADMIN ROUTES  (require a valid token AND the 'admin' role)
 *   GET    /api/admin/stats              dashboard counts
 *   GET    /api/admin/users              list all users
 *   GET    /api/admin/recipes            list EVERY custom recipe (all users)
 *   POST   /api/admin/recipes            create a recipe (owned by the admin)
 *   PATCH  /api/admin/recipes/:id        edit ANY recipe (photo/content/ingredients)
 *   DELETE /api/admin/recipes/:id        delete ANY recipe
 *
 * Teaching point: this is the same CRUD you already know, but WITHOUT the
 * `AND user_id = ?` ownership scoping — because an admin is allowed to manage
 * everyone's recipes. The gate is the `requireAdmin` middleware instead.
 */
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { parse } from "../util.js";
import { priceForMeal } from "../mealdb.js";
import { createRecipeSchema, updateRecipeSchema } from "@shared/schemas";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin); // both guards, in order

// Present a custom_recipes row (joined with its owner) the way the UI expects.
function toAdminRecipe(row: any) {
  return {
    id: row.id,
    idMeal: `custom-${row.id}`,
    strMeal: row.name,
    strCategory: row.category,
    strArea: row.area,
    strInstructions: row.instructions,
    strMealThumb: row.image_url,
    ingredients: JSON.parse(row.ingredients || "[]"),
    price: priceForMeal(`custom-${row.id}`),
    isCustom: true,
    createdAt: row.created_at,
    owner: { id: row.user_id, displayName: row.display_name, email: row.email },
  };
}

adminRouter.get("/stats", (_req, res) => {
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  res.json({
    stats: {
      users: count("SELECT COUNT(*) AS n FROM users"),
      recipes: count("SELECT COUNT(*) AS n FROM custom_recipes"),
      orders: count("SELECT COUNT(*) AS n FROM orders"),
      reviews: count("SELECT COUNT(*) AS n FROM reviews"),
    },
  });
});

adminRouter.get("/users", (_req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.display_name AS displayName, u.role, u.created_at AS createdAt,
              (SELECT COUNT(*) FROM custom_recipes r WHERE r.user_id = u.id) AS recipeCount,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orderCount
       FROM users u ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users });
});

adminRouter.get("/recipes", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, u.display_name, u.email
       FROM custom_recipes r JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC`
    )
    .all();
  res.json({ recipes: rows.map(toAdminRecipe) });
});

adminRouter.post("/recipes", (req, res) => {
  const body = parse(createRecipeSchema, req.body, res);
  if (!body) return;

  const info = db
    .prepare(
      `INSERT INTO custom_recipes (user_id, name, category, area, instructions, image_url, ingredients)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.sub, // the admin owns recipes they create here
      body.name,
      body.category || "Misc",
      body.area || "Unknown",
      body.instructions,
      body.imageUrl || "",
      JSON.stringify(body.ingredients)
    );
  res.status(201).json({ recipe: loadRecipe(info.lastInsertRowid) });
});

// NOTE: no `AND user_id = ?` — an admin may edit ANY recipe.
adminRouter.patch("/recipes/:id", (req, res) => {
  const body = parse(updateRecipeSchema, req.body, res);
  if (!body) return;

  const info = db
    .prepare(
      `UPDATE custom_recipes
       SET name = ?, category = ?, area = ?, instructions = ?, image_url = ?, ingredients = ?
       WHERE id = ?`
    )
    .run(
      body.name,
      body.category || "Misc",
      body.area || "Unknown",
      body.instructions,
      body.imageUrl || "",
      JSON.stringify(body.ingredients),
      req.params.id
    );
  if (info.changes === 0) return res.status(404).json({ error: "Recipe not found" });
  res.json({ recipe: loadRecipe(req.params.id) });
});

adminRouter.delete("/recipes/:id", (req, res) => {
  const info = db.prepare("DELETE FROM custom_recipes WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Recipe not found" });
  res.status(204).end();
});

/* ----- EXISTING (TheMealDB) MEALS — edited via overrides (see overrides.ts) ----- */

// List which TheMealDB meal ids currently have an override (for "Edited" badges).
adminRouter.get("/meals/overrides", (_req, res) => {
  const rows = db.prepare("SELECT meal_id FROM meal_overrides").all() as { meal_id: string }[];
  res.json({ overriddenIds: rows.map((r) => r.meal_id) });
});

// Create/replace the override for an existing meal (UPSERT keyed by meal_id).
adminRouter.patch("/meals/:mealId", (req, res) => {
  const mealId = req.params.mealId;
  if (mealId.startsWith("custom-")) {
    return res.status(400).json({ error: "Use /admin/recipes for custom recipes" });
  }
  const body = parse(updateRecipeSchema, req.body, res);
  if (!body) return;

  db.prepare(
    `INSERT INTO meal_overrides (meal_id, name, category, area, instructions, image_url, ingredients, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(meal_id) DO UPDATE SET
       name=excluded.name, category=excluded.category, area=excluded.area,
       instructions=excluded.instructions, image_url=excluded.image_url,
       ingredients=excluded.ingredients, updated_by=excluded.updated_by,
       updated_at=datetime('now')`
  ).run(
    mealId,
    body.name,
    body.category || "Misc",
    body.area || "Unknown",
    body.instructions,
    body.imageUrl || "",
    JSON.stringify(body.ingredients),
    req.user!.sub
  );
  res.json({ ok: true, mealId });
});

// Revert an existing meal back to its original TheMealDB data.
adminRouter.delete("/meals/:mealId", (req, res) => {
  const info = db.prepare("DELETE FROM meal_overrides WHERE meal_id = ?").run(req.params.mealId);
  if (info.changes === 0) return res.status(404).json({ error: "No override to revert" });
  res.status(204).end();
});

function loadRecipe(id: number | string | bigint) {
  const row = db
    .prepare(
      `SELECT r.*, u.display_name, u.email
       FROM custom_recipes r JOIN users u ON u.id = r.user_id WHERE r.id = ?`
    )
    .get(id);
  return row ? toAdminRecipe(row) : null;
}
