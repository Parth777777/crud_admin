/** Frontend-facing data shapes (mirror what the server sends). */

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: "user" | "admin";
}

export interface AdminRecipe extends Meal {
  id: number;
  createdAt: string;
  owner: { id: number; displayName: string; email: string };
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: "user" | "admin";
  createdAt: string;
  recipeCount: number;
  orderCount: number;
}

export interface AdminStats {
  users: number;
  recipes: number;
  orders: number;
  reviews: number;
}

export interface Ingredient {
  name: string;
  measure: string;
}

// A meal as shown in detail view (full data, from TheMealDB or a custom recipe).
export interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb: string;
  strYoutube?: string;
  ingredients?: Ingredient[];
  price: number;
  isCustom?: boolean;
  isMine?: boolean;
}

// Lighter meal shape used in grids (category filter only returns these fields).
export interface MealCardData {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  price: number;
  isCustom?: boolean;
  isMine?: boolean;
  matchCount?: number;
}

export interface Favorite {
  id: number;
  meal_id: string;
  meal_name: string;
  meal_thumb: string;
  note: string;
  created_at: string;
}

export interface Review {
  id: number;
  user_id: number;
  meal_id: string;
  rating: number;
  comment: string;
  author: string;
  created_at: string;
}

export type OrderStatus = "pending" | "preparing" | "delivered" | "cancelled";

export interface OrderItem {
  id: number;
  meal_id: string;
  meal_name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export interface PantryItem {
  id: number;
  ingredient: string;
}

export interface Category {
  id: string;
  name: string;
  thumb: string;
  description: string;
}
