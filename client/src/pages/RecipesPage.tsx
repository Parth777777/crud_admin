/**
 * MY RECIPES — the most complete CRUD UI in the app.
 *   CREATE: the "Add recipe" form (with a dynamic list of ingredient rows)
 *   READ:   your recipes grid
 *   UPDATE: the same form, pre-filled, when you click Edit
 *   DELETE: remove a recipe
 *
 * Validated with the shared `createRecipeSchema`, so the client checks the data
 * before sending and the server checks it again on arrival.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMessage } from "../lib/api";
import { createRecipeSchema, type CreateRecipeInput } from "@shared/schemas";
import { useToast } from "../lib/toast";
import { GridSkeleton } from "../components/Skeleton";
import { PlusIcon, TrashIcon } from "../components/icons";
import type { Meal } from "../lib/types";

const EMPTY: CreateRecipeInput = {
  name: "",
  category: "Misc",
  area: "Unknown",
  instructions: "",
  imageUrl: "",
  ingredients: [{ name: "", measure: "" }],
};

export default function RecipesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateRecipeInput>(EMPTY);
  const [error, setError] = useState("");

  const recipesQ = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => (await api.get<{ recipes: (Meal & { id: number })[] }>("/recipes")).data.recipes,
  });

  const save = useMutation({
    mutationFn: async () => {
      // Validate with the SAME schema the server uses.
      const parsed = createRecipeSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      return editingId
        ? api.patch(`/recipes/${editingId}`, parsed.data)
        : api.post("/recipes", parsed.data);
    },
    onSuccess: () => {
      toast.show(editingId ? "Recipe updated" : "Recipe created");
      qc.invalidateQueries({ queryKey: ["recipes"] });
      closeForm();
    },
    onError: (e) => setError(errMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/recipes/${id}`),
    onSuccess: () => {
      toast.show("Recipe deleted");
      qc.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(r: Meal & { id: number }) {
    setForm({
      name: r.strMeal,
      category: r.strCategory || "Misc",
      area: r.strArea || "Unknown",
      instructions: r.strInstructions || "",
      imageUrl: r.strMealThumb || "",
      ingredients: r.ingredients?.length ? r.ingredients : [{ name: "", measure: "" }],
    });
    setEditingId(r.id);
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  // Helpers for the dynamic ingredient rows.
  const setIngredient = (i: number, key: "name" | "measure", val: string) =>
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((ing, idx) => (idx === i ? { ...ing, [key]: val } : ing)),
    }));
  const addRow = () => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { name: "", measure: "" }] }));
  const removeRow = (i: number) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">My Recipes</h1>
          <p className="text-slate-500">Create your own dishes — they appear across Foodly badged “Mine”.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <PlusIcon width={18} height={18} /> Add recipe
        </button>
      </header>

      {recipesQ.isLoading ? (
        <GridSkeleton count={3} />
      ) : recipesQ.data?.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center text-slate-400">
          No recipes yet. Click “Add recipe” to create your first dish.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recipesQ.data?.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              <Link to={`/meal/${r.idMeal}`}>
                <div className="h-40 w-full overflow-hidden bg-slate-100">
                  {r.strMealThumb ? (
                    <img src={r.strMealThumb} alt={r.strMeal} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-slate-300">No image</div>
                  )}
                </div>
              </Link>
              <div className="space-y-2 p-4">
                <Link to={`/meal/${r.idMeal}`} className="font-semibold hover:text-brand-600">
                  {r.strMeal}
                </Link>
                <p className="text-sm text-slate-400">
                  {r.strArea} · {r.strCategory} · {r.ingredients?.length || 0} ingredients
                </p>
                <div className="flex gap-2 pt-1">
                  <button className="btn-ghost px-3 py-1.5" onClick={() => openEdit(r)}>
                    Edit
                  </button>
                  <button className="btn-danger px-3 py-1.5" onClick={() => remove.mutate(r.id)}>
                    <TrashIcon width={16} height={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <div className="card w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId ? "Edit recipe" : "New recipe"}</h2>
              <button className="text-slate-400 hover:text-slate-700" onClick={closeForm} aria-label="Close">
                ×
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grandma's Lasagna" />
              </Field>
              <Field label="Image URL">
                <input className="input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
              </Field>
              <Field label="Category">
                <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Field>
              <Field label="Area / Cuisine">
                <input className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </Field>
            </div>

            <Field label="Ingredients" className="mt-4">
              <div className="space-y-2">
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input" placeholder="Ingredient" value={ing.name} onChange={(e) => setIngredient(i, "name", e.target.value)} />
                    <input className="input w-32" placeholder="Measure" value={ing.measure} onChange={(e) => setIngredient(i, "measure", e.target.value)} />
                    <button className="btn-ghost px-3" onClick={() => removeRow(i)} disabled={form.ingredients.length === 1}>
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                ))}
                <button className="btn-ghost" onClick={addRow}>
                  <PlusIcon width={16} height={16} /> Add ingredient
                </button>
              </div>
            </Field>

            <Field label="Instructions" className="mt-4">
              <textarea className="input" rows={5} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Step by step…" />
            </Field>

            {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={closeForm}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : editingId ? "Save changes" : "Create recipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
