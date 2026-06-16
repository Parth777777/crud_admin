/**
 * MEAL CARD — the rounded food card from the Foodly design.
 * Shows image, name, price, optional rating + "Mine" badge, a heart (favorite
 * toggle, optimistic), and an "Add" button that drops the meal into the cart.
 */
import { Link } from "react-router-dom";
import type { MealCardData } from "../lib/types";
import { useFavorites } from "../hooks/useFavorites";
import { useCart } from "../cart/CartContext";
import { useToast } from "../lib/toast";
import { HeartIcon, PlusIcon, StarIcon } from "./icons";

export function MealCard({
  meal,
  rating,
}: {
  meal: MealCardData;
  rating?: { avg: number; count: number };
}) {
  const { isFavorited, toggle } = useFavorites();
  const cart = useCart();
  const toast = useToast();
  const faved = isFavorited(meal.idMeal);

  return (
    <div className="card group relative overflow-hidden">
      {/* Heart sits on top of the image */}
      <button
        onClick={() => toggle.mutate(meal)}
        className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${
          faved ? "bg-rose-500 text-white" : "bg-white/80 text-slate-500 hover:text-rose-500"
        }`}
        aria-label={faved ? "Remove from cookbook" : "Save to cookbook"}
      >
        <HeartIcon filled={faved} width={18} height={18} />
      </button>

      {meal.isMine && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
          Mine
        </span>
      )}

      <Link to={`/meal/${meal.idMeal}`} className="block">
        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
          {meal.strMealThumb ? (
            <img
              src={meal.strMealThumb}
              alt={meal.strMeal}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-300">No image</div>
          )}
        </div>
      </Link>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/meal/${meal.idMeal}`} className="font-semibold leading-tight hover:text-brand-600">
            {meal.strMeal}
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          {rating && rating.count > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <StarIcon filled width={15} height={15} />
              {rating.avg} <span className="text-slate-400">({rating.count})</span>
            </span>
          ) : (
            <span className="text-slate-300">No reviews yet</span>
          )}
          {meal.matchCount && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {meal.matchCount} pantry match{meal.matchCount > 1 ? "es" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-bold text-slate-900">${meal.price?.toFixed(2)}</span>
          <button
            className="btn-primary px-3 py-1.5"
            onClick={() => {
              cart.add({
                mealId: meal.idMeal,
                mealName: meal.strMeal,
                mealThumb: meal.strMealThumb,
                price: meal.price,
              });
              toast.show(`Added “${meal.strMeal}” to cart`);
            }}
          >
            <PlusIcon width={16} height={16} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
