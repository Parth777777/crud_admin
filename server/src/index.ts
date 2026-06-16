/**
 * SERVER ENTRYPOINT
 * -----------------
 * This is where an incoming HTTP request's journey begins. Read top-to-bottom
 * to see the REQUEST LIFECYCLE:
 *
 *   request -> CORS -> JSON body parser -> matching router -> your handler
 *           -> (if it throws) error handler -> response
 *
 * Routers are mounted under URL prefixes (e.g. everything in favoritesRouter
 * lives under /api/favorites).
 */
import "dotenv/config";
import express from "express";
import cors from "cors";

import { migrate } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { mealsRouter } from "./routes/meals.js";
import { favoritesRouter } from "./routes/favorites.js";
import { reviewsRouter } from "./routes/reviews.js";
import { recipesRouter } from "./routes/recipes.js";
import { ordersRouter } from "./routes/orders.js";
import { pantryRouter } from "./routes/pantry.js";
import { adminRouter } from "./routes/admin.js";

migrate(); // create tables if they don't exist yet

const app = express();

// CORS lets the browser (running on the Vite dev port) call this API on a
// different port. Without it the browser blocks the requests.
app.use(cors());
// Parse incoming JSON request bodies into `req.body`.
app.use(express.json());

// A quick "is the server alive?" check you can open in a browser.
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "foodly-api" }));

// Mount every feature's router under its URL prefix.
app.use("/api/auth", authRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/pantry", pantryRouter);
app.use("/api/admin", adminRouter);

// 404 for any /api route we didn't define.
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// CENTRAL ERROR HANDLER. Any route that calls next(err) — or throws in an
// async wrapper — ends up here, so we always return clean JSON.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err?.message || err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`\n🍽  Foodly API running at http://localhost:${PORT}`);
  console.log(`   Try: http://localhost:${PORT}/api/health\n`);
});
