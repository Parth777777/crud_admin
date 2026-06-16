/**
 * ORDERS  — PROTECTED CRUD with a RELATIONSHIP + a STATUS STATE MACHINE
 *   GET    /api/orders        read my orders (each with its items)
 *   POST   /api/orders        CREATE an order from cart items (checkout)
 *   PATCH  /api/orders/:id    UPDATE status (advance step, or cancel)
 *   DELETE /api/orders/:id    DELETE an order
 *
 * Teaching points:
 *   - ONE-TO-MANY: an `order` has many `order_items`. We write both inside a
 *     TRANSACTION so they always succeed or fail together (no half-saved order).
 *   - STATE MACHINE: status can only move pending -> preparing -> delivered,
 *     and can be cancelled (unless delivered). We reject illegal jumps.
 */
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { parse } from "../util.js";
import { createOrderSchema, updateOrderSchema, type OrderStatus } from "@shared/schemas";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// Which statuses you're allowed to move TO from a given status.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["delivered", "cancelled"],
  delivered: [], // terminal
  cancelled: [], // terminal
};

function loadOrder(orderId: number | string, userId: number) {
  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(orderId, userId) as any;
  if (!order) return null;
  order.items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
  return order;
}

ordersRouter.get("/", (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user!.sub) as any[];
  for (const o of orders) {
    o.items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(o.id);
  }
  res.json({ orders });
});

ordersRouter.post("/", (req, res) => {
  const body = parse(createOrderSchema, req.body, res);
  if (!body) return;

  const total = body.items.reduce((sum, it) => sum + it.price * it.qty, 0);

  // A TRANSACTION groups several writes into one all-or-nothing unit.
  const checkout = db.transaction(() => {
    const info = db
      .prepare("INSERT INTO orders (user_id, status, total) VALUES (?, 'pending', ?)")
      .run(req.user!.sub, Number(total.toFixed(2)));
    const orderId = info.lastInsertRowid;
    const insertItem = db.prepare(
      "INSERT INTO order_items (order_id, meal_id, meal_name, qty, price) VALUES (?, ?, ?, ?, ?)"
    );
    for (const it of body.items) {
      insertItem.run(orderId, it.mealId, it.mealName, it.qty, it.price);
    }
    return orderId;
  });

  const orderId = checkout();
  res.status(201).json({ order: loadOrder(orderId as number, req.user!.sub) });
});

ordersRouter.patch("/:id", (req, res) => {
  const body = parse(updateOrderSchema, req.body, res);
  if (!body) return;

  const order = loadOrder(req.params.id, req.user!.sub);
  if (!order) return res.status(404).json({ error: "Order not found" });

  // Enforce the state machine: is this a legal transition?
  if (!NEXT[order.status as OrderStatus].includes(body.status)) {
    return res
      .status(400)
      .json({ error: `Cannot change status from "${order.status}" to "${body.status}"` });
  }

  db.prepare("UPDATE orders SET status = ? WHERE id = ? AND user_id = ?").run(
    body.status,
    req.params.id,
    req.user!.sub
  );
  res.json({ order: loadOrder(req.params.id, req.user!.sub) });
});

ordersRouter.delete("/:id", (req, res) => {
  // order_items rows are removed automatically thanks to ON DELETE CASCADE.
  const info = db
    .prepare("DELETE FROM orders WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user!.sub);
  if (info.changes === 0) return res.status(404).json({ error: "Order not found" });
  res.status(204).end();
});
