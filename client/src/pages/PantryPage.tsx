/**
 * PANTRY — CRUD (add/remove ingredients) that feeds a DERIVED read:
 * "What can I make?" calls GET /api/pantry/match, which fans out to TheMealDB
 * per ingredient and ranks meals by how many of your ingredients they use.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMessage } from "../lib/api";
import type { MealCardData, PantryItem } from "../lib/types";
import { useToast } from "../lib/toast";
import { MealCard } from "../components/MealCard";
import { PlusIcon, TrashIcon } from "../components/icons";

export default function PantryPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [ingredient, setIngredient] = useState("");

  const pantryQ = useQuery({
    queryKey: ["pantry"],
    queryFn: async () => (await api.get<{ items: PantryItem[] }>("/pantry")).data.items,
  });

  const add = useMutation({
    mutationFn: async (name: string) => api.post("/pantry", { ingredient: name }),
    onSuccess: () => {
      setIngredient("");
      qc.invalidateQueries({ queryKey: ["pantry"] });
    },
    onError: (e) => toast.show(errMessage(e), "error"),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/pantry/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pantry"] }),
  });

  // The derived read is only run on demand (enabled: false + refetch()).
  const matchQ = useQuery({
    queryKey: ["pantry-match"],
    enabled: false,
    queryFn: async () =>
      (await api.get<{ matches: MealCardData[]; pantryCount: number }>("/pantry/match")).data,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">My Pantry</h1>
        <p className="text-slate-500">
          List what you have, then discover meals you can cook. (Free TheMealDB tier matches one
          ingredient at a time — we combine the results ourselves.)
        </p>
      </header>

      <div className="card p-5">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (ingredient.trim()) add.mutate(ingredient.trim());
          }}
        >
          <input
            className="input"
            placeholder="Add an ingredient (e.g. chicken, garlic, rice)"
            value={ingredient}
            onChange={(e) => setIngredient(e.target.value)}
          />
          <button className="btn-primary shrink-0">
            <PlusIcon width={18} height={18} /> Add
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {pantryQ.data?.length === 0 && <p className="text-slate-400">Your pantry is empty.</p>}
          {pantryQ.data?.map((item) => (
            <span key={item.id} className="chip bg-slate-50 capitalize text-slate-700 ring-1 ring-slate-200">
              {item.ingredient}
              <button className="text-slate-400 hover:text-rose-500" onClick={() => remove.mutate(item.id)}>
                <TrashIcon width={14} height={14} />
              </button>
            </span>
          ))}
        </div>

        {(pantryQ.data?.length ?? 0) > 0 && (
          <button
            className="btn-primary mt-4"
            onClick={() => matchQ.refetch()}
            disabled={matchQ.isFetching}
          >
            {matchQ.isFetching ? "Searching…" : "What can I make?"}
          </button>
        )}
      </div>

      {matchQ.data && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            {matchQ.data.matches.length} meals from your {matchQ.data.pantryCount} ingredients
          </h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
            {matchQ.data.matches.map((m) => (
              <MealCard key={m.idMeal} meal={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
