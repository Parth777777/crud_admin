/**
 * FAVORITES (the "Cookbook")  — PROTECTED CRUD
 *   GET    /api/favorites          read all of MY favorites
 *   POST   /api/favorites          CREATE a favorite
 *   PATCH  /api/favorites/:id      UPDATE the personal note
 *   DELETE /api/favorites/:id      DELETE a favorite
 *
 * Every query is scoped with `WHERE user_id = ?` using `req.user.sub` — that is
 * AUTHORIZATION. Authentication = "who are you?"; authorization = "are you
 * allowed to touch THIS row?". You can never see or edit another user's data.
 */
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { parse } from "../util.js";
import { createFavoriteSchema, updateFavoriteSchema } from "@shared/schemas";

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth); // every route below requires a valid token

favoritesRouter.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user!.sub);
  res.json({ favorites: rows });
});

favoritesRouter.post("/", (req, res) => {
  const body = parse(createFavoriteSchema, req.body, res);
  if (!body) return;

  // UNIQUE(user_id, meal_id) means favoriting twice would error — handle it nicely.
  const existing = db
    .prepare("SELECT * FROM favorites WHERE user_id = ? AND meal_id = ?")
    .get(req.user!.sub, body.mealId);
  if (existing) return res.status(200).json({ favorite: existing });

  const info = db
    .prepare(
      "INSERT INTO favorites (user_id, meal_id, meal_name, meal_thumb, note) VALUES (?, ?, ?, ?, ?)"
    )
    .run(req.user!.sub, body.mealId, body.mealName, body.mealThumb || "", body.note || "");
  const favorite = db.prepare("SELECT * FROM favorites WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ favorite });
});

favoritesRouter.patch("/:id", (req, res) => {
  const body = parse(updateFavoriteSchema, req.body, res);
  if (!body) return;

  // The `AND user_id = ?` is the ownership check baked into the UPDATE itself.
  const info = db
    .prepare("UPDATE favorites SET note = ? WHERE id = ? AND user_id = ?")
    .run(body.note, req.params.id, req.user!.sub);
  if (info.changes === 0) return res.status(404).json({ error: "Favorite not found" });

  const favorite = db.prepare("SELECT * FROM favorites WHERE id = ?").get(req.params.id);
  res.json({ favorite });
});

favoritesRouter.delete("/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM favorites WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user!.sub);
  if (info.changes === 0) return res.status(404).json({ error: "Favorite not found" });
  res.status(204).end();
});
