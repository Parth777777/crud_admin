/**
 * useFavorites — the "Cookbook" data hook, and a great example of OPTIMISTIC
 * UPDATES with React Query.
 *
 * Reading: useQuery caches GET /api/favorites under the key ["favorites"].
 * Writing: each mutation, on success, INVALIDATES that key so the list refetches.
 *
 * The `toggle` mutation is optimistic: we update the cached list IMMEDIATELY
 * (so the heart fills instantly), then roll back if the server call fails.
 * That's why the UI feels instant even though there's a network round-trip.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Favorite, MealCardData } from "../lib/types";

export function useFavorites() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => (await api.get<{ favorites: Favorite[] }>("/favorites")).data.favorites,
  });

  const favorites = query.data ?? [];
  const isFavorited = (mealId: string) => favorites.some((f) => f.meal_id === mealId);

  // CREATE a favorite (heart a meal).
  const addFavorite = useMutation({
    mutationFn: async (meal: MealCardData) =>
      (
        await api.post("/favorites", {
          mealId: meal.idMeal,
          mealName: meal.strMeal,
          mealThumb: meal.strMealThumb,
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  // DELETE a favorite by its row id.
  const removeFavorite = useMutation({
    mutationFn: async (favoriteId: number) => api.delete(`/favorites/${favoriteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  // UPDATE the personal note on a favorite.
  const updateNote = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) =>
      (await api.patch(`/favorites/${id}`, { note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  // Convenience: heart on/off from a meal card (optimistic).
  const toggle = useMutation({
    mutationFn: async (meal: MealCardData) => {
      const existing = favorites.find((f) => f.meal_id === meal.idMeal);
      if (existing) return api.delete(`/favorites/${existing.id}`);
      return api.post("/favorites", {
        mealId: meal.idMeal,
        mealName: meal.strMeal,
        mealThumb: meal.strMealThumb,
      });
    },
    onMutate: async (meal) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData<Favorite[]>(["favorites"]) ?? [];
      const exists = prev.some((f) => f.meal_id === meal.idMeal);
      const next = exists
        ? prev.filter((f) => f.meal_id !== meal.idMeal)
        : [
            {
              id: -Date.now(), // temporary id until the refetch replaces it
              meal_id: meal.idMeal,
              meal_name: meal.strMeal,
              meal_thumb: meal.strMealThumb,
              note: "",
              created_at: "",
            } as Favorite,
            ...prev,
          ];
      qc.setQueryData(["favorites"], next);
      return { prev }; // hand the snapshot to onError for rollback
    },
    onError: (_e, _meal, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev); // ROLLBACK
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  return { ...query, favorites, isFavorited, addFavorite, removeFavorite, updateNote, toggle };
}
