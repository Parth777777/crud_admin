/**
 * CART PANEL — the right-hand "My Orders" panel from the design.
 * Local cart -> Checkout -> POST /api/orders creates a real Order in the DB.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { api, errMessage } from "../lib/api";
import { useToast } from "../lib/toast";
import { TrashIcon } from "./icons";

export function CartPanel() {
  const cart = useCart();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const checkout = useMutation({
    mutationFn: async () =>
      (
        await api.post("/orders", {
          items: cart.lines.map((l) => ({
            mealId: l.mealId,
            mealName: l.mealName,
            qty: l.qty,
            price: l.price,
          })),
        })
      ).data,
    onSuccess: () => {
      cart.clear();
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.show("Order placed!");
      navigate("/orders");
    },
    onError: (e) => toast.show(errMessage(e), "error"),
  });

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-slate-100 bg-white p-5 xl:flex">
      <h2 className="text-lg font-bold">My Cart</h2>
      <p className="mb-4 text-sm text-slate-400">
        {cart.count} item{cart.count !== 1 ? "s" : ""}
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {cart.lines.length === 0 && (
          <div className="grid place-items-center rounded-3xl bg-slate-50 py-12 text-center text-sm text-slate-400">
            Your cart is empty.
            <br /> Add a dish to get started.
          </div>
        )}

        {cart.lines.map((l) => (
          <div key={l.mealId} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5">
            <img src={l.mealThumb} alt="" className="h-12 w-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{l.mealName}</p>
              <p className="text-xs text-slate-400">${l.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="grid h-6 w-6 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200"
                onClick={() => cart.setQty(l.mealId, l.qty - 1)}
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
              <button
                className="grid h-6 w-6 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200"
                onClick={() => cart.setQty(l.mealId, l.qty + 1)}
              >
                +
              </button>
            </div>
            <button
              className="text-slate-300 hover:text-rose-500"
              onClick={() => cart.remove(l.mealId)}
              aria-label="Remove"
            >
              <TrashIcon width={16} height={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-slate-500">Total</span>
          <span className="text-xl font-extrabold">${cart.total.toFixed(2)}</span>
        </div>
        <button
          className="btn-primary w-full py-3"
          disabled={cart.lines.length === 0 || checkout.isPending}
          onClick={() => checkout.mutate()}
        >
          {checkout.isPending ? "Placing…" : "Checkout"}
        </button>
      </div>
    </aside>
  );
}
