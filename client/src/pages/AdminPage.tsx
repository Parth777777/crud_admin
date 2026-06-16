/**
 * ADMIN PANEL — manage recipe content stored in OUR backend.
 *
 * Admins can edit ANY custom recipe's photo, text, category/area, and
 * ingredients (TheMealDB meals are read-only and can't be edited). It also
 * shows a small dashboard and a users list.
 *
 * Every call here hits /api/admin/* which is guarded by `requireAdmin` on the
 * server — so even if a non-admin reached this screen, the API would say 403.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMessage } from "../lib/api";
import { createRecipeSchema, type CreateRecipeInput } from "@shared/schemas";
import type { AdminRecipe, AdminStats, AdminUser, Meal } from "../lib/types";
import { useToast } from "../lib/toast";
import { PlusIcon, TrashIcon, ImageIcon, SearchIcon } from "../components/icons";

const EMPTY: CreateRecipeInput = {
  name: "",
  category: "Misc",
  area: "Unknown",
  instructions: "",
  imageUrl: "",
  ingredients: [{ name: "", measure: "" }],
};

export default function AdminPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"recipes" | "catalog" | "users">("recipes");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null); // custom recipe id
  const [editingMealId, setEditingMealId] = useState<string | null>(null); // TheMealDB id (override)
  const [form, setForm] = useState<CreateRecipeInput>(EMPTY);
  const [error, setError] = useState("");

  // Catalog (existing TheMealDB meals) search.
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogTerm, setCatalogTerm] = useState(""); // submitted term

  const statsQ = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get<{ stats: AdminStats }>("/admin/stats")).data.stats,
  });

  const recipesQ = useQuery({
    queryKey: ["admin-recipes"],
    queryFn: async () => (await api.get<{ recipes: AdminRecipe[] }>("/admin/recipes")).data.recipes,
  });

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    enabled: tab === "users",
    queryFn: async () => (await api.get<{ users: AdminUser[] }>("/admin/users")).data.users,
  });

  // Which existing meals already have an admin override (for the "Edited" badge).
  const overridesQ = useQuery({
    queryKey: ["admin-overrides"],
    queryFn: async () =>
      (await api.get<{ overriddenIds: string[] }>("/admin/meals/overrides")).data.overriddenIds,
  });
  const overriddenSet = new Set(overridesQ.data ?? []);

  // Catalog search results (existing TheMealDB meals).
  const catalogQ = useQuery({
    queryKey: ["admin-catalog", catalogTerm],
    enabled: tab === "catalog" && catalogTerm.length > 0,
    queryFn: async () =>
      (await api.get<{ meals: Meal[] }>(`/meals/search?q=${encodeURIComponent(catalogTerm)}`)).data.meals,
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = createRecipeSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (editingMealId) return api.patch(`/admin/meals/${editingMealId}`, parsed.data); // override existing meal
      return editingId
        ? api.patch(`/admin/recipes/${editingId}`, parsed.data) // edit custom recipe
        : api.post("/admin/recipes", parsed.data); // create custom recipe
    },
    onSuccess: () => {
      toast.show(editingMealId ? "Meal updated" : editingId ? "Recipe updated" : "Recipe created");
      qc.invalidateQueries({ queryKey: ["admin-recipes"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-overrides"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      qc.invalidateQueries({ queryKey: ["meals"] }); // refresh user-facing grids
      qc.invalidateQueries({ queryKey: ["meal"] }); // refresh any open detail page
      qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      closeForm();
    },
    onError: (e) => setError(errMessage(e)),
  });

  // Revert an existing meal back to its original TheMealDB data.
  const revert = useMutation({
    mutationFn: async (mealId: string) => api.delete(`/admin/meals/${mealId}`),
    onSuccess: () => {
      toast.show("Reverted to original");
      qc.invalidateQueries({ queryKey: ["admin-overrides"] });
      qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["meal"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/recipes/${id}`),
    onSuccess: () => {
      toast.show("Recipe deleted");
      qc.invalidateQueries({ queryKey: ["admin-recipes"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  // Prefill the form from any meal-like object.
  function fillForm(m: { strMeal: string; strCategory?: string; strArea?: string; strInstructions?: string; strMealThumb?: string; ingredients?: { name: string; measure: string }[] }) {
    setForm({
      name: m.strMeal,
      category: m.strCategory || "Misc",
      area: m.strArea || "Unknown",
      instructions: m.strInstructions || "",
      imageUrl: m.strMealThumb || "",
      ingredients: m.ingredients?.length ? m.ingredients : [{ name: "", measure: "" }],
    });
    setError("");
    setShowForm(true);
  }

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setEditingMealId(null);
    setError("");
    setShowForm(true);
  }
  function openEditRecipe(r: AdminRecipe) {
    setEditingId(r.id);
    setEditingMealId(null);
    fillForm(r);
  }
  function openEditMeal(m: Meal) {
    setEditingMealId(m.idMeal); // editing an existing TheMealDB meal -> override
    setEditingId(null);
    fillForm(m);
  }
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setEditingMealId(null);
    setForm(EMPTY);
    setError("");
  }

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Admin Panel</h1>
          <p className="text-slate-500">Manage recipe photos, content & ingredients in your backend.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <PlusIcon width={18} height={18} /> New recipe
        </button>
      </header>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={statsQ.data?.users} />
        <StatCard label="Recipes" value={statsQ.data?.recipes} />
        <StatCard label="Orders" value={statsQ.data?.orders} />
        <StatCard label="Reviews" value={statsQ.data?.reviews} />
      </div>

      {/* TABS */}
      <div className="flex gap-2">
        <button className={`chip ${tab === "recipes" ? "bg-brand-500 text-white" : "bg-white ring-1 ring-slate-200"}`} onClick={() => setTab("recipes")}>
          Custom recipes
        </button>
        <button className={`chip ${tab === "catalog" ? "bg-brand-500 text-white" : "bg-white ring-1 ring-slate-200"}`} onClick={() => setTab("catalog")}>
          Edit existing meals
        </button>
        <button className={`chip ${tab === "users" ? "bg-brand-500 text-white" : "bg-white ring-1 ring-slate-200"}`} onClick={() => setTab("users")}>
          Users
        </button>
      </div>

      {tab === "recipes" && (
        <div className="card overflow-hidden">
          {recipesQ.isLoading ? (
            <p className="p-6 text-slate-400">Loading recipes…</p>
          ) : recipesQ.data?.length === 0 ? (
            <p className="p-6 text-slate-400">No custom recipes yet. Create one with “New recipe”.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="p-4">Recipe</th>
                  <th className="hidden p-4 sm:table-cell">Category</th>
                  <th className="hidden p-4 md:table-cell">Owner</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipesQ.data?.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {r.strMealThumb ? (
                            <img src={r.strMealThumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center text-slate-300">
                              <ImageIcon width={18} height={18} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{r.strMeal}</p>
                          <p className="text-xs text-slate-400">{r.ingredients?.length || 0} ingredients</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden p-4 text-slate-500 sm:table-cell">
                      {r.strCategory} · {r.strArea}
                    </td>
                    <td className="hidden p-4 text-slate-500 md:table-cell">{r.owner.displayName}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button className="btn-ghost px-3 py-1.5" onClick={() => openEditRecipe(r)}>
                          Edit
                        </button>
                        <button className="btn-danger px-3 py-1.5" onClick={() => remove.mutate(r.id)}>
                          <TrashIcon width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CATALOG — search existing TheMealDB meals and edit them (overrides) */}
      {tab === "catalog" && (
        <div className="space-y-4">
          <div className="card p-5">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                setCatalogTerm(catalogQuery.trim());
              }}
            >
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-11"
                placeholder="Search existing meals to edit (e.g. Arrabiata, beef)…"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
              />
            </form>
            <p className="mt-2 text-xs text-slate-400">
              TheMealDB meals are read-only, so your edits are saved as overrides in your backend
              and merged on top wherever the meal appears. “Revert” removes the override.
            </p>
          </div>

          <div className="card overflow-hidden">
            {!catalogTerm ? (
              <p className="p-6 text-slate-400">Search above to find meals to edit.</p>
            ) : catalogQ.isFetching ? (
              <p className="p-6 text-slate-400">Searching…</p>
            ) : (catalogQ.data?.length ?? 0) === 0 ? (
              <p className="p-6 text-slate-400">No meals found for “{catalogTerm}”.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody>
                  {catalogQ.data?.map((m) => {
                    const edited = overriddenSet.has(m.idMeal);
                    return (
                      <tr key={m.idMeal} className="border-b border-slate-50 last:border-0">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {m.strMealThumb && (
                                <img src={m.strMealThumb} alt="" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">
                                {m.strMeal}
                                {edited && (
                                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                                    Edited
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {m.strArea} · {m.strCategory}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button className="btn-ghost px-3 py-1.5" onClick={() => openEditMeal(m)}>
                              Edit
                            </button>
                            {edited && (
                              <button
                                className="btn-danger px-3 py-1.5"
                                onClick={() => revert.mutate(m.idMeal)}
                              >
                                Revert
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="card overflow-hidden">
          {usersQ.isLoading ? (
            <p className="p-6 text-slate-400">Loading users…</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="hidden p-4 sm:table-cell">Recipes</th>
                  <th className="hidden p-4 sm:table-cell">Orders</th>
                </tr>
              </thead>
              <tbody>
                {usersQ.data?.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0">
                    <td className="p-4">
                      <p className="font-semibold">{u.displayName}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="p-4">
                      <span className={`chip ${u.role === "admin" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="hidden p-4 text-slate-500 sm:table-cell">{u.recipeCount}</td>
                    <td className="hidden p-4 text-slate-500 sm:table-cell">{u.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10">
          <div className="card w-full max-w-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingMealId ? "Edit existing meal" : editingId ? "Edit recipe" : "New recipe"}
              </h2>
              <button className="text-slate-400 hover:text-slate-700" onClick={closeForm} aria-label="Close">
                ×
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-[200px,1fr]">
              {/* PHOTO column with live preview */}
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-600">Photo</span>
                <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-slate-300">
                      <ImageIcon width={28} height={28} />
                    </div>
                  )}
                </div>
                <input
                  className="input mt-2"
                  placeholder="Image URL"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>

              {/* CONTENT column */}
              <div className="space-y-4">
                <Field label="Name">
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category">
                    <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  </Field>
                  <Field label="Area / Cuisine">
                    <input className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                  </Field>
                </div>

                <Field label="Ingredients">
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

                <Field label="Instructions">
                  <textarea className="input" rows={5} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
                </Field>
              </div>
            </div>

            {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={closeForm}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending
                  ? "Saving…"
                  : editingMealId || editingId
                    ? "Save changes"
                    : "Create recipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value ?? "—"}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
