/**
 * MEAL DETAIL — the richest screen. It combines:
 *   - an EXTERNAL read (the meal itself, from TheMealDB or a custom recipe)
 *   - OWNED CRUD (your reviews) layered on top of that meal by meal_id
 *   - favorite toggle + add-to-cart
 *
 * The Reviews section is a complete CRUD UI: create, read (everyone's), update
 * (yours), delete (yours).
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMessage } from "../lib/api";
import type { Meal, Review } from "../lib/types";
import { useFavorites } from "../hooks/useFavorites";
import { useCart } from "../cart/CartContext";
import { useToast } from "../lib/toast";
import { Stars } from "../components/Stars";
import { HeartIcon, TrashIcon } from "../components/icons";

export default function MealDetailPage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const cart = useCart();
  const { isFavorited, toggle } = useFavorites();

  const mealQ = useQuery({
    queryKey: ["meal", id],
    queryFn: async () => (await api.get<{ meal: Meal }>(`/meals/${id}`)).data.meal,
  });

  if (mealQ.isLoading) return <div className="animate-pulse text-slate-400">Loading meal…</div>;
  if (!mealQ.data) return <div className="text-slate-500">Meal not found.</div>;

  const meal = mealQ.data;
  const faved = isFavorited(meal.idMeal);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* HEADER */}
      <div className="card overflow-hidden">
        <div className="h-64 w-full overflow-hidden bg-slate-100">
          {meal.strMealThumb && (
            <img src={meal.strMealThumb} alt={meal.strMeal} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold">{meal.strMeal}</h1>
              <p className="mt-1 text-slate-500">
                {meal.strArea} · {meal.strCategory}
                {meal.isCustom && (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                    Custom recipe
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggle.mutate(meal)}
                className={`btn ${faved ? "bg-rose-500 text-white" : "btn-ghost"}`}
              >
                <HeartIcon filled={faved} width={18} height={18} />
                {faved ? "Saved" : "Save"}
              </button>
              <button
                className="btn-primary"
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
                Add · ${meal.price?.toFixed(2)}
              </button>
            </div>
          </div>

          {/* INGREDIENTS */}
          {meal.ingredients && meal.ingredients.length > 0 && (
            <div>
              <h3 className="mb-2 font-bold">Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {meal.ingredients.map((ing, i) => (
                  <span key={i} className="chip bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                    {ing.name}
                    {ing.measure ? <span className="text-slate-400">· {ing.measure}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* INSTRUCTIONS */}
          {meal.strInstructions && (
            <div>
              <h3 className="mb-2 font-bold">Instructions</h3>
              <p className="whitespace-pre-line leading-relaxed text-slate-600">{meal.strInstructions}</p>
            </div>
          )}

          {meal.strYoutube && (
            <a href={meal.strYoutube} target="_blank" rel="noreferrer" className="btn-ghost">
              Watch on YouTube
            </a>
          )}
        </div>
      </div>

      <ReviewsSection mealId={meal.idMeal} />
    </div>
  );
}

/* ----------------------------- REVIEWS CRUD ----------------------------- */

function ReviewsSection({ mealId }: { mealId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const reviewsQ = useQuery({
    queryKey: ["reviews", mealId],
    queryFn: async () =>
      (await api.get<{ reviews: Review[]; myUserId: number }>(`/reviews?mealId=${mealId}`)).data,
  });

  const reviews = reviewsQ.data?.reviews ?? [];
  const myUserId = reviewsQ.data?.myUserId;
  const myReview = reviews.find((r) => r.user_id === myUserId);

  // After any change, refetch this meal's reviews AND its star summary on cards.
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["reviews", mealId] });
    qc.invalidateQueries({ queryKey: ["review-summary"] });
  };

  const create = useMutation({
    mutationFn: async () => api.post("/reviews", { mealId, rating, comment }),
    onSuccess: () => {
      toast.show("Review posted");
      setComment("");
      refresh();
    },
    onError: (e) => toast.show(errMessage(e), "error"),
  });

  const update = useMutation({
    mutationFn: async (reviewId: number) => api.patch(`/reviews/${reviewId}`, { rating, comment }),
    onSuccess: () => {
      toast.show("Review updated");
      setEditingId(null);
      refresh();
    },
    onError: (e) => toast.show(errMessage(e), "error"),
  });

  const remove = useMutation({
    mutationFn: async (reviewId: number) => api.delete(`/reviews/${reviewId}`),
    onSuccess: () => {
      toast.show("Review deleted");
      refresh();
    },
    onError: (e) => toast.show(errMessage(e), "error"),
  });

  function startEdit(r: Review) {
    setEditingId(r.id);
    setRating(r.rating);
    setComment(r.comment);
  }

  return (
    <section className="card space-y-5 p-6">
      <h2 className="text-xl font-bold">Reviews ({reviews.length})</h2>

      {/* CREATE / EDIT form — shown when you have no review, or are editing yours */}
      {(!myReview || editingId === myReview.id) && (
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-600">
            {editingId ? "Edit your review" : "Write a review"}
          </p>
          <Stars value={rating} onChange={setRating} size={26} />
          <textarea
            className="input mt-3"
            rows={3}
            placeholder="How was it?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="btn-primary"
              onClick={() => (editingId ? update.mutate(editingId) : create.mutate())}
            >
              {editingId ? "Save changes" : "Post review"}
            </button>
            {editingId && (
              <button className="btn-ghost" onClick={() => setEditingId(null)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* READ — list of everyone's reviews */}
      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-slate-400">No reviews yet — be the first!</p>}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {r.author}{" "}
                  {r.user_id === myUserId && (
                    <span className="text-xs font-medium text-brand-600">(you)</span>
                  )}
                </p>
                <Stars value={r.rating} />
              </div>
              {/* UPDATE / DELETE only on YOUR review */}
              {r.user_id === myUserId && editingId !== r.id && (
                <div className="flex gap-2">
                  <button className="btn-ghost px-3 py-1.5" onClick={() => startEdit(r)}>
                    Edit
                  </button>
                  <button className="btn-danger px-3 py-1.5" onClick={() => remove.mutate(r.id)}>
                    <TrashIcon width={16} height={16} />
                  </button>
                </div>
              )}
            </div>
            {r.comment && <p className="mt-2 text-slate-600">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
