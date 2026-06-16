/**
 * THEMEALDB PROXY
 * ---------------
 * TheMealDB is a free, READ-ONLY public recipe API. We never write to it.
 * Instead of calling it directly from the browser, the browser calls OUR
 * server, and our server calls TheMealDB. This is called a "proxy" or
 * "backend-for-frontend". Why bother?
 *
 *   - One place to keep the base URL / API key.
 *   - We can ENRICH the data before sending it on (e.g. attach our own
 *     review averages, or merge in user-created recipes).
 *   - Avoids browser CORS issues and hides API details from the client.
 *
 * Test API key is "1" (fine for development / educational use).
 *
 * Node 18+ has a built-in global `fetch`, so we don't need any HTTP library.
 */

const BASE = "https://www.themealdb.com/api/json/v1/1";

// The raw meal object from TheMealDB has flat strIngredient1..20 fields.
// We expose a cleaned-up shape to our client.
export interface NormalizedMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strYoutube: string;
  ingredients: { name: string; measure: string }[];
  price: number; // synthetic — TheMealDB has no prices (see LEARN.md)
  isCustom: boolean;
}

/**
 * TheMealDB has no prices, but our "ordering" feature needs them. We derive a
 * stable, fake price from the meal id so the same meal always costs the same.
 * This is a deliberate teaching simplification, documented in LEARN.md.
 */
export function priceForMeal(mealId: string): number {
  let sum = 0;
  for (const ch of mealId) sum += ch.charCodeAt(0);
  return Number((6 + (sum % 15) + 0.99).toFixed(2)); // $6.99 .. $20.99
}

// Turn strIngredient1..20 / strMeasure1..20 into a tidy array.
export function normalizeMeal(raw: any): NormalizedMeal {
  const ingredients: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (raw[`strIngredient${i}`] || "").trim();
    const measure = (raw[`strMeasure${i}`] || "").trim();
    if (name) ingredients.push({ name, measure });
  }
  return {
    idMeal: raw.idMeal,
    strMeal: raw.strMeal,
    strCategory: raw.strCategory || "",
    strArea: raw.strArea || "",
    strInstructions: raw.strInstructions || "",
    strMealThumb: raw.strMealThumb || "",
    strYoutube: raw.strYoutube || "",
    ingredients,
    price: priceForMeal(raw.idMeal),
    isCustom: false,
  };
}

async function get(path: string): Promise<any> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`TheMealDB request failed: ${res.status}`);
  return res.json();
}

export const mealdb = {
  async search(query: string) {
    const data = await get(`search.php?s=${encodeURIComponent(query)}`);
    return (data.meals || []).map(normalizeMeal);
  },
  async byCategory(category: string) {
    // filter.php returns ONLY id/name/thumb (no full detail) — that's fine for a grid.
    const data = await get(`filter.php?c=${encodeURIComponent(category)}`);
    return (data.meals || []).map((m: any) => ({
      idMeal: m.idMeal,
      strMeal: m.strMeal,
      strMealThumb: m.strMealThumb,
      price: priceForMeal(m.idMeal),
      isCustom: false,
    }));
  },
  async byIngredient(ingredient: string) {
    const data = await get(`filter.php?i=${encodeURIComponent(ingredient)}`);
    return (data.meals || []).map((m: any) => ({
      idMeal: m.idMeal,
      strMeal: m.strMeal,
      strMealThumb: m.strMealThumb,
      price: priceForMeal(m.idMeal),
      isCustom: false,
    }));
  },
  async lookup(id: string): Promise<NormalizedMeal | null> {
    const data = await get(`lookup.php?i=${encodeURIComponent(id)}`);
    return data.meals?.[0] ? normalizeMeal(data.meals[0]) : null;
  },
  async random(): Promise<NormalizedMeal | null> {
    const data = await get(`random.php`);
    return data.meals?.[0] ? normalizeMeal(data.meals[0]) : null;
  },
  async categories() {
    const data = await get(`categories.php`);
    return (data.categories || []).map((c: any) => ({
      id: c.idCategory,
      name: c.strCategory,
      thumb: c.strCategoryThumb,
      description: c.strCategoryDescription,
    }));
  },
};
