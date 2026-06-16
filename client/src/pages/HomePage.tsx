/**
 * HOME / DISCOVER
 * ---------------
 * The "external read flow" in action. Three independent React Query reads:
 *   - categories  (GET /api/meals/categories)
 *   - the grid    (GET /api/meals/search?q= OR /api/meals/category/:cat)
 *   - a featured "Surprise Me" meal (GET /api/meals/random)
 * Plus a follow-up read for review stars on whatever meals are shown.
 *
 * React Query caches each by its queryKey, so switching categories back and
 * forth is instant (served from cache) — open the Devtools to watch it.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Category, Meal, MealCardData } from "../lib/types";
import { MealCard } from "../components/MealCard";
import { GridSkeleton } from "../components/Skeleton";
import { ShuffleIcon } from "../components/icons";
import { useCart } from "../cart/CartContext";
import { useToast } from "../lib/toast";

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [category, setCategory] = useState("Beef");

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<{ categories: Category[] }>("/meals/categories")).data.categories,
    staleTime: Infinity,
  });

  // The grid: search results when there's a query, otherwise the chosen category.
  const gridQ = useQuery({
    queryKey: ["meals", q ? `search:${q}` : `cat:${category}`],
    queryFn: async () => {
      const url = q ? `/meals/search?q=${encodeURIComponent(q)}` : `/meals/category/${category}`;
      return (await api.get<{ meals: MealCardData[] }>(url)).data.meals;
    },
  });

  const meals = gridQ.data ?? [];

  // Star ratings for the meals currently on screen (one batched request).
  const ids = useMemo(() => meals.map((m) => m.idMeal).join(","), [meals]);
  const ratingsQ = useQuery({
    queryKey: ["review-summary", ids],
    enabled: ids.length > 0,
    queryFn: async () =>
      (await api.get<{ summary: Record<string, { avg: number; count: number }> }>(
        `/meals/reviews/summary?ids=${ids}`
      )).data.summary,
  });

  return (
    <div className="space-y-8">
      <Hero />

      {/* CATEGORY CHIPS */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{q ? `Results for “${q}”` : "Categories"}</h2>
          {q && (
            <button onClick={() => setParams({})} className="text-sm font-semibold text-brand-600">
              Clear search
            </button>
          )}
        </div>
        {!q && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {categoriesQ.data?.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.name)}
                className={`chip ${
                  category === c.name
                    ? "bg-brand-500 text-white shadow-card"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MEAL GRID */}
      {gridQ.isLoading ? (
        <GridSkeleton />
      ) : meals.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center text-slate-400">
          No meals found. Try another search or category.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
          {meals.map((m) => (
            <MealCard key={m.idMeal} meal={m} rating={ratingsQ.data?.[m.idMeal]} />
          ))}
        </div>
      )}
    </div>
  );
}

/** The big featured-dish hero with a "Surprise Me" shuffle. */
function Hero() {
  const cart = useCart();
  const toast = useToast();
  const { data: meal, refetch, isFetching } = useQuery({
    queryKey: ["random-meal"],
    queryFn: async () => (await api.get<{ meal: Meal }>("/meals/random")).data.meal,
  });

  return (
    <section className="card overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 text-white">
      <div className="flex flex-col items-center gap-6 p-8 sm:flex-row">
        <div className="flex-1">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
            Featured today
          </span>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight">
            {meal?.strMeal ?? "Finding something tasty…"}
          </h1>
          <p className="mt-1 text-brand-50/90">
            {meal?.strArea} · {meal?.strCategory}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {meal && (
              <>
                <Link to={`/meal/${meal.idMeal}`} className="btn bg-white text-brand-700 hover:bg-brand-50">
                  View recipe
                </Link>
                <button
                  className="btn bg-white/15 text-white hover:bg-white/25"
                  onClick={() => {
                    cart.add({
                      mealId: meal.idMeal,
                      mealName: meal.strMeal,
                      mealThumb: meal.strMealThumb,
                      price: meal.price,
                    });
                    toast.show("Added to cart");
                  }}
                >
                  Add to cart · ${meal.price?.toFixed(2)}
                </button>
              </>
            )}
            <button
              className="btn bg-white/15 text-white hover:bg-white/25"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <ShuffleIcon width={16} height={16} /> {isFetching ? "Shuffling…" : "Surprise me"}
            </button>
          </div>
        </div>
        <div className="h-44 w-44 shrink-0 overflow-hidden rounded-3xl ring-4 ring-white/30">
          {meal?.strMealThumb && (
            <img src={meal.strMealThumb} alt={meal.strMeal} className="h-full w-full object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}
