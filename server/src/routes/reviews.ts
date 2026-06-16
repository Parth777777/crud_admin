/**
 * REVIEWS & RATINGS  — PROTECTED CRUD
 *   GET    /api/reviews?mealId=...   read reviews for a meal (+ which one is mine)
 *   POST   /api/reviews              CREATE my review
 *   PATCH  /api/reviews/:id          UPDATE my review
 *   DELETE /api/reviews/:id          DELETE my review
 *
 * Teaching point: TheMealDB meals have NO reviews. We attach our OWN reviews to
 * any meal by its `meal_id`. The UNIQUE(user_id, meal_id) constraint enforces
 * "one review per user per meal".
 */
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { parse } from "../util.js";
import { createReviewSchema, updateReviewSchema } from "@shared/schemas";

export const reviewsRouter = Router();
reviewsRouter.use(requireAuth);

reviewsRouter.get("/", (req, res) => {
  const mealId = String(req.query.mealId || "");
  if (!mealId) return res.status(400).json({ error: "mealId query param required" });

  // Join to users so the UI can show who wrote each review.
  const reviews = db
    .prepare(
      `SELECT r.*, u.display_name AS author
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.meal_id = ? ORDER BY r.created_at DESC`
    )
    .all(mealId);
  res.json({ reviews, myUserId: req.user!.sub });
});

reviewsRouter.post("/", (req, res) => {
  const body = parse(createReviewSchema, req.body, res);
  if (!body) return;

  const existing = db
    .prepare("SELECT id FROM reviews WHERE user_id = ? AND meal_id = ?")
    .get(req.user!.sub, body.mealId);
  if (existing) {
    return res.status(409).json({ error: "You already reviewed this meal — edit it instead." });
  }

  const info = db
    .prepare("INSERT INTO reviews (user_id, meal_id, rating, comment) VALUES (?, ?, ?, ?)")
    .run(req.user!.sub, body.mealId, body.rating, body.comment || "");
  const review = db.prepare("SELECT * FROM reviews WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ review });
});

reviewsRouter.patch("/:id", (req, res) => {
  const body = parse(updateReviewSchema, req.body, res);
  if (!body) return;

  const info = db
    .prepare("UPDATE reviews SET rating = ?, comment = ? WHERE id = ? AND user_id = ?")
    .run(body.rating, body.comment || "", req.params.id, req.user!.sub);
  if (info.changes === 0) return res.status(404).json({ error: "Review not found" });

  const review = db.prepare("SELECT * FROM reviews WHERE id = ?").get(req.params.id);
  res.json({ review });
});

reviewsRouter.delete("/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM reviews WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user!.sub);
  if (info.changes === 0) return res.status(404).json({ error: "Review not found" });
  res.status(204).end();
});
