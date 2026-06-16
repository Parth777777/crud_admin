/**
 * SHARED SCHEMAS  (used by BOTH the React client and the Express server)
 * ----------------------------------------------------------------------
 * This is one of the most important teaching ideas in the whole project.
 *
 * A "schema" describes the SHAPE of data: which fields exist, their types,
 * and the rules they must obey (e.g. password >= 6 chars). We write each
 * schema ONCE here with `zod`, then import it on both sides:
 *
 *   - The CLIENT uses it to validate a form BEFORE sending (instant feedback).
 *   - The SERVER uses it to validate the request body AFTER receiving it.
 *
 * Why validate twice? Because the client can be bypassed (anyone can call
 * your API directly with curl). The server is the real trust boundary — it
 * must never trust input. The client check is just a nicety for the user.
 *
 * Each `z.infer<...>` line turns a runtime schema into a TypeScript type, so
 * we get autocomplete + compile-time safety for free, with no duplication.
 */
import { z } from "zod";

/* ----------------------------- AUTH ----------------------------- */

export const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Tell us your name").max(40),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* --------------------------- FAVORITES --------------------------- */

export const createFavoriteSchema = z.object({
  mealId: z.string().min(1),
  mealName: z.string().min(1),
  mealThumb: z.string().url().or(z.literal("")).optional(),
  note: z.string().max(280).optional().default(""),
});
export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;

export const updateFavoriteSchema = z.object({
  note: z.string().max(280),
});
export type UpdateFavoriteInput = z.infer<typeof updateFavoriteSchema>;

/* ---------------------------- REVIEWS ---------------------------- */

export const createReviewSchema = z.object({
  mealId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(""),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(""),
});
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/* ------------------------- CUSTOM RECIPES ------------------------ */

export const recipeIngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name required"),
  measure: z.string().optional().default(""),
});

export const createRecipeSchema = z.object({
  name: z.string().min(1, "Recipe name required").max(80),
  category: z.string().max(40).optional().default("Misc"),
  area: z.string().max(40).optional().default("Unknown"),
  instructions: z.string().min(1, "Add some instructions").max(5000),
  imageUrl: z.string().url("Use a valid image URL").or(z.literal("")).optional().default(""),
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient"),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
// Editing a recipe uses the same shape as creating one.
export const updateRecipeSchema = createRecipeSchema;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

/* ---------------------------- ORDERS ----------------------------- */

export const orderItemSchema = z.object({
  mealId: z.string().min(1),
  mealName: z.string().min(1),
  qty: z.number().int().min(1).max(99),
  price: z.number().min(0),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Your cart is empty"),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// The allowed order statuses, and the only legal "next step" transitions.
export const ORDER_STATUSES = ["pending", "preparing", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

/* ---------------------------- PANTRY ----------------------------- */

export const createPantryItemSchema = z.object({
  ingredient: z.string().min(1, "Ingredient required").max(40),
});
export type CreatePantryItemInput = z.infer<typeof createPantryItemSchema>;
