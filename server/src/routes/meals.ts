/**
 * MEAL ROUTES  (public read — these proxy TheMealDB and enrich the data)
 *   GET /api/meals/categories
 *   GET /api/meals/random
 *   GET /api/meals/search?q=...
 *   GET /api/meals/category/:cat
 *   GET /api/meals/:id
 *   GET /api/meals/reviews/summary?ids=1,2,3   (avg rating + count per meal)
 *
 * This is the "EXTERNAL READ FLOW": browser -> our server -> TheMealDB -> back.
 * Compare it with the protected CRUD routes, which are the "OWNED WRITE FLOW".
 */
import { Router } from "express";
import { db } from "../db.js";
import { mealdb, priceForMeal } from "../mealdb.js";
import { getOverride, getOverrides, applyFull, applyCard } from "../overrides.js";

export const mealsRouter = Router();

// Helper: average rating + count for a single meal id, from OUR reviews table.
function reviewSummary(mealId: string) {
  const row = db
    .prepare("SELECT COUNT(*) AS count, AVG(rating) AS avg FROM reviews WHERE meal_id = ?")
    .get(mealId) as any;
  return { count: row.count as number, avg: row.avg ? Number(row.avg.toFixed(1)) : 0 };
}

// Turn a custom_recipes DB row into the same shape as a TheMealDB meal.
function recipeRowToMeal(row: any) {
  return {
    idMeal: `custom-${row.id}`,
    strMeal: row.name,
    strCategory: row.category,
    strArea: row.area,
    strInstructions: row.instructions,
    strMealThumb: row.image_url,
    strYoutube: "",
    ingredients: JSON.parse(row.ingredients || "[]"),
    price: priceForMeal(`custom-${row.id}`),
    isCustom: true,
  };
}

mealsRouter.get("/categories", async (_req, res, next) => {
  try {
    res.json({ categories: await mealdb.categories() });
  } catch (e) {
    next(e);
  }
});

mealsRouter.get("/random", async (_req, res, next) => {
  try {
    res.json({ meal: await mealdb.random() });
  } catch (e) {
    next(e);
  }
});

mealsRouter.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "");
    const meals = await mealdb.search(q);
    // Merge any admin overrides on top of the live results.
    const ov = getOverrides(meals.map((m: any) => m.idMeal));
    res.json({ meals: meals.map((m: any) => applyFull(m, ov.get(m.idMeal))) });
  } catch (e) {
    next(e);
  }
});

mealsRouter.get("/category/:cat", async (req, res, next) => {
  try {
    const meals = await mealdb.byCategory(req.params.cat);
    const ov = getOverrides(meals.map((m: any) => m.idMeal));
    res.json({ meals: meals.map((m: any) => applyCard(m, ov.get(m.idMeal))) });
  } catch (e) {
    next(e);
  }
});

// Average rating + count for many meals at once (for the grid's star badges).
mealsRouter.get("/reviews/summary", (req, res) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const summary: Record<string, { avg: number; count: number }> = {};
  for (const id of ids) summary[id] = reviewSummary(id);
  res.json({ summary });
});

// Single meal detail. A "custom-NN" id is one of OUR recipes; anything else is
// a TheMealDB id. Either way we attach our own review summary.
mealsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    let meal: any = null;

    if (id.startsWith("custom-")) {
      const realId = id.replace("custom-", "");
      const row = db.prepare("SELECT * FROM custom_recipes WHERE id = ?").get(realId);
      meal = row ? recipeRowToMeal(row) : null;
    } else {
      meal = await mealdb.lookup(id);
      // Merge an admin override (if any) on top of the TheMealDB data.
      if (meal) meal = applyFull(meal, getOverride(id));
    }

    if (!meal) return res.status(404).json({ error: "Meal not found" });
    res.json({ meal, reviews: reviewSummary(id) });
  } catch (e) {
    next(e);
  }
});
