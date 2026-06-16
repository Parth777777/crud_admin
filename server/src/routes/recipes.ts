/**
 * CUSTOM RECIPES  — PROTECTED CRUD (the most complete CRUD example)
 *   GET    /api/recipes        read MY recipes
 *   POST   /api/recipes        CREATE a recipe (with an array of ingredients)
 *   PATCH  /api/recipes/:id    UPDATE a recipe
 *   DELETE /api/recipes/:id    DELETE a recipe
 *
 * Teaching points:
 *   - Storing an ARRAY (ingredients) in SQLite: we JSON.stringify it into one
 *     TEXT column, and JSON.parse it back out. (A bigger app would use a
 *     separate table; JSON keeps this approachable.)
 *   - OWNERSHIP: edit/delete only succeed when the row's user_id matches you.
 *   - These recipes are surfaced with id "custom-NN" so they can live in the
 *     same lists as TheMealDB meals (see routes/meals.ts).
 */
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { parse } from "../util.js";
import { priceForMeal } from "../mealdb.js";
import { createRecipeSchema, updateRecipeSchema } from "@shared/schemas";

export const recipesRouter = Router();
recipesRouter.use(requireAuth);

// Present a DB row the way the rest of the app expects a "meal" to look.
function toMeal(row: any) {
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
    isMine: true,
  };
}

recipesRouter.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM custom_recipes WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user!.sub);
  res.json({ recipes: rows.map(toMeal) });
});

recipesRouter.post("/", (req, res) => {
  const body = parse(createRecipeSchema, req.body, res);
  if (!body) return;

  const info = db
    .prepare(
      `INSERT INTO custom_recipes (user_id, name, category, area, instructions, image_url, ingredients)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.sub,
      body.name,
      body.category || "Misc",
      body.area || "Unknown",
      body.instructions,
      body.imageUrl || "",
      JSON.stringify(body.ingredients)
    );
  const row = db.prepare("SELECT * FROM custom_recipes WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ recipe: toMeal(row) });
});

recipesRouter.patch("/:id", (req, res) => {
  const body = parse(updateRecipeSchema, req.body, res);
  if (!body) return;

  const info = db
    .prepare(
      `UPDATE custom_recipes
       SET name = ?, category = ?, area = ?, instructions = ?, image_url = ?, ingredients = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(
      body.name,
      body.category || "Misc",
      body.area || "Unknown",
      body.instructions,
      body.imageUrl || "",
      JSON.stringify(body.ingredients),
      req.params.id,
      req.user!.sub
    );
  if (info.changes === 0) return res.status(404).json({ error: "Recipe not found" });

  const row = db.prepare("SELECT * FROM custom_recipes WHERE id = ?").get(req.params.id);
  res.json({ recipe: toMeal(row) });
});

recipesRouter.delete("/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM custom_recipes WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user!.sub);
  if (info.changes === 0) return res.status(404).json({ error: "Recipe not found" });
  res.status(204).end();
});
