/**
 * ORDERS — read your order history, advance an order through its lifecycle, or
 * cancel/delete it. This is the UI for the STATE MACHINE enforced on the server
 * (pending -> preparing -> delivered, with cancel allowed before delivery).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMessage } from "../lib/api";
import type { Order, OrderStatus } from "../lib/types";
import { useToast } from "../lib/toast";
import { TrashIcon } from "../components/icons";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  preparing: "bg-blue-50 text-blue-700",
  delivered: "bg-brand-50 text-brand-700",
  cancelled: "bg-rose-50 text-rose-600",
};

// What the "next step" button does for each status (mirrors the server rules).
const NEXT_ACTION: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "preparing", label: "Start preparing" },
  preparing: { to: "delivered", label: "Mark delivered" },
};

export default function OrdersPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const ordersQ = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await api.get<{ orders: Order[] }>("/orders")).data.orders,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/orders/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
    onError: (e) => toast.show(errMessage(e), "error"),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/orders/${id}`),
    onSuccess: () => {
      toast.show("Order deleted");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Orders</h1>
        <p className="text-slate-500">Track each order through its lifecycle.</p>
      </header>

      {ordersQ.isLoading ? (
        <p className="animate-pulse text-slate-400">Loading orders…</p>
      ) : ordersQ.data?.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center text-slate-400">
          No orders yet. Add meals to your cart and check out.
        </div>
      ) : (
        <div className="space-y-4">
          {ordersQ.data?.map((order) => {
            const next = NEXT_ACTION[order.status];
            const canCancel = order.status === "pending" || order.status === "preparing";
            return (
              <div key={order.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">Order #{order.id}</p>
                    <p className="text-sm text-slate-400">{new Date(order.created_at + "Z").toLocaleString()}</p>
                  </div>
                  <span className={`chip font-bold capitalize ${STATUS_STYLE[order.status]}`}>{order.status}</span>
                </div>

                <div className="my-4 space-y-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {it.qty} × {it.meal_name}
                      </span>
                      <span className="font-medium">${(it.price * it.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <span className="text-lg font-extrabold">${order.total.toFixed(2)}</span>
                  <div className="flex flex-wrap gap-2">
                    {next && (
                      <button
                        className="btn-primary px-3 py-1.5"
                        onClick={() => setStatus.mutate({ id: order.id, status: next.to })}
                      >
                        {next.label}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        className="btn-ghost px-3 py-1.5"
                        onClick={() => setStatus.mutate({ id: order.id, status: "cancelled" })}
                      >
                        Cancel
                      </button>
                    )}
                    <button className="btn-danger px-3 py-1.5" onClick={() => remove.mutate(order.id)}>
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
