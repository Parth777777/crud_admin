/**
 * COOKBOOK — your saved favorites. Full CRUD UI:
 *   READ:   the grid of favorites
 *   UPDATE: inline-edit the personal note on each one
 *   DELETE: remove a favorite
 * (CREATE happens elsewhere — the heart button on any meal card.)
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "../hooks/useFavorites";
import { useToast } from "../lib/toast";
import { errMessage } from "../lib/api";
import { GridSkeleton } from "../components/Skeleton";
import { TrashIcon } from "../components/icons";
import type { Favorite } from "../lib/types";

export default function CookbookPage() {
  const { favorites, isLoading, updateNote, removeFavorite } = useFavorites();
  const toast = useToast();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">My Cookbook</h1>
        <p className="text-slate-500">Meals you saved. Add a private note to each.</p>
      </header>

      {isLoading ? (
        <GridSkeleton count={4} />
      ) : favorites.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center text-slate-400">
          Nothing saved yet. Tap the heart on any meal to add it here.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((fav) => (
            <FavoriteCard
              key={fav.id}
              fav={fav}
              onSaveNote={(note) =>
                updateNote.mutate(
                  { id: fav.id, note },
                  {
                    onSuccess: () => toast.show("Note saved"),
                    onError: (e) => toast.show(errMessage(e), "error"),
                  }
                )
              }
              onDelete={() =>
                removeFavorite.mutate(fav.id, {
                  onSuccess: () => toast.show("Removed from cookbook"),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({
  fav,
  onSaveNote,
  onDelete,
}: {
  fav: Favorite;
  onSaveNote: (note: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(fav.note);

  return (
    <div className="card overflow-hidden">
      <Link to={`/meal/${fav.meal_id}`}>
        <div className="h-40 w-full overflow-hidden bg-slate-100">
          {fav.meal_thumb && <img src={fav.meal_thumb} alt={fav.meal_name} className="h-full w-full object-cover" />}
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/meal/${fav.meal_id}`} className="font-semibold hover:text-brand-600">
            {fav.meal_name}
          </Link>
          <button className="text-slate-300 hover:text-rose-500" onClick={onDelete} aria-label="Remove">
            <TrashIcon width={18} height={18} />
          </button>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Make for Sunday dinner" />
            <div className="flex gap-2">
              <button
                className="btn-primary px-3 py-1.5"
                onClick={() => {
                  onSaveNote(note);
                  setEditing(false);
                }}
              >
                Save
              </button>
              <button className="btn-ghost px-3 py-1.5" onClick={() => { setNote(fav.note); setEditing(false); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="block w-full text-left text-sm">
            {fav.note ? (
              <span className="text-slate-600">Note: {fav.note}</span>
            ) : (
              <span className="text-brand-600">+ Add a note</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
