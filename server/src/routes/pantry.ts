/**
 * PANTRY + "What can I make?"  — PROTECTED CRUD feeding a DERIVED READ
 *   GET    /api/pantry          read my pantry ingredients
 *   POST   /api/pantry          CREATE (add an ingredient)
 *   DELETE /api/pantry/:id      DELETE (remove an ingredient)
 *   GET    /api/pantry/match    derived: meals I can make, ranked by overlap
 *
 * Teaching points:
 *   - CRUD data (your pantry) feeding into a computed result.
 *   - "FAN-OUT": we call TheMealDB once PER pantry ingredient (in parallel with
 *     Promise.all), then count how many of your ingredients each meal uses.
 *   - REAL-WORLD CONSTRAINT: the free TheMealDB tier only filters by a SINGLE
 *     ingredient at a time, so multi-ingredient matching must be done by us.
 *     We surface this limit instead of hiding it.
 */
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { parse } from "../util.js";
import { mealdb } from "../mealdb.js";
import { createPantryItemSchema } from "@shared/schemas";

export const pantryRouter = Router();
pantryRouter.use(requireAuth);

pantryRouter.get("/", (req, res) => {
  const items = db
    .prepare("SELECT * FROM pantry_items WHERE user_id = ? ORDER BY ingredient")
    .all(req.user!.sub);
  res.json({ items });
});

pantryRouter.post("/", (req, res) => {
  const body = parse(createPantryItemSchema, req.body, res);
  if (!body) return;

  const ingredient = body.ingredient.trim().toLowerCase();
  try {
    const info = db
      .prepare("INSERT INTO pantry_items (user_id, ingredient) VALUES (?, ?)")
      .run(req.user!.sub, ingredient);
    const item = db.prepare("SELECT * FROM pantry_items WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json({ item });
  } catch {
    // UNIQUE(user_id, ingredient) violation -> already in the pantry.
    res.status(409).json({ error: "That ingredient is already in your pantry" });
  }
});

pantryRouter.delete("/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM pantry_items WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user!.sub);
  if (info.changes === 0) return res.status(404).json({ error: "Pantry item not found" });
  res.status(204).end();
});

pantryRouter.get("/match", async (req, res, next) => {
  try {
    const items = db
      .prepare("SELECT ingredient FROM pantry_items WHERE user_id = ?")
      .all(req.user!.sub) as { ingredient: string }[];

    if (items.length === 0) return res.json({ matches: [], pantryCount: 0 });

    // Fan out: one TheMealDB call per ingredient, all at once.
    const lists = await Promise.all(
      items.map((it) => mealdb.byIngredient(it.ingredient).catch(() => []))
    );

    // Count how many of MY ingredients each meal appears under.
    const tally = new Map<string, { meal: any; hits: number }>();
    lists.forEach((meals) => {
      meals.forEach((m: any) => {
        const cur = tally.get(m.idMeal);
        if (cur) cur.hits += 1;
        else tally.set(m.idMeal, { meal: m, hits: 1 });
      });
    });

    const matches = [...tally.values()]
      .sort((a, b) => b.hits - a.hits) // best overlap first
      .slice(0, 24)
      .map(({ meal, hits }) => ({ ...meal, matchCount: hits }));

    res.json({ matches, pantryCount: items.length });
  } catch (e) {
    next(e);
  }
});
