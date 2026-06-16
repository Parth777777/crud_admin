/**
 * MEAL OVERRIDES
 * --------------
 * TheMealDB is read-only, so admins can't change it directly. Instead, when an
 * admin edits an existing meal we save a row in `meal_overrides` keyed by the
 * TheMealDB meal id. These helpers MERGE that override on top of the live
 * TheMealDB data wherever a meal is shown (detail, search, category grid).
 *
 * Only non-empty override fields win — so an admin can change just the photo
 * and leave everything else as TheMealDB provides it.
 */
import { db } from "./db.js";

export interface OverrideRow {
  meal_id: string;
  name: string | null;
  category: string | null;
  area: string | null;
  instructions: string | null;
  image_url: string | null;
  ingredients: string | null; // JSON
  updated_by: number | null;
  updated_at: string;
}

export function getOverride(mealId: string): OverrideRow | undefined {
  return db.prepare("SELECT * FROM meal_overrides WHERE meal_id = ?").get(mealId) as
    | OverrideRow
    | undefined;
}

// Fetch overrides for many ids at once -> Map keyed by meal_id (for lists).
export function getOverrides(mealIds: string[]): Map<string, OverrideRow> {
  const map = new Map<string, OverrideRow>();
  if (mealIds.length === 0) return map;
  const placeholders = mealIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM meal_overrides WHERE meal_id IN (${placeholders})`)
    .all(...mealIds) as OverrideRow[];
  for (const r of rows) map.set(r.meal_id, r);
  return map;
}

// Merge an override onto a FULL meal object (detail / search results).
export function applyFull<T extends Record<string, any>>(meal: T, ov?: OverrideRow): T {
  if (!ov) return meal;
  return {
    ...meal,
    strMeal: ov.name ?? meal.strMeal,
    strCategory: ov.category ?? meal.strCategory,
    strArea: ov.area ?? meal.strArea,
    strInstructions: ov.instructions ?? meal.strInstructions,
    strMealThumb: ov.image_url ?? meal.strMealThumb,
    ingredients: ov.ingredients ? JSON.parse(ov.ingredients) : meal.ingredients,
    isEdited: true, // flag so the UI can badge it "Edited"
  };
}

// Merge an override onto a light grid CARD (only name + thumb matter there).
export function applyCard<T extends Record<string, any>>(card: T, ov?: OverrideRow): T {
  if (!ov) return card;
  return {
    ...card,
    strMeal: ov.name ?? card.strMeal,
    strMealThumb: ov.image_url ?? card.strMealThumb,
    isEdited: true,
  };
}
