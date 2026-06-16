# 🍽️ Foodly — Learn CRUD, Dataflow & JWT by Building

A modern, full-stack food app you build to **learn web development end-to-end**:
a cutting-edge React UI, a real database, JWT-secured login, and **CRUD exercised
in the frontend *and* backend**. Recipe data comes from the free
[TheMealDB API](https://www.themealdb.com/); everything you create, rate, save,
and order lives in your own SQLite database.

> New here? Read **[LEARN.md](./LEARN.md)** — it walks through every concept
> (JWT, dataflow, CRUD, optimistic updates) using this exact codebase.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query |
| Backend | Node + Express (TypeScript via `tsx`) |
| Database | SQLite (`better-sqlite3`) — a single `server/foodly.db` file |
| Auth | JWT (`jsonwebtoken`) + bcrypt password hashing |
| Validation | Zod schemas **shared** by client & server (`shared/schemas.ts`) |

---

## Prerequisites

- **Node 18+** (this project is pinned to **20.11.1** via `.nvmrc`).
  If you use `nvm`: `nvm use` inside the project folder.

Check: `node -v`

---

## Run it

```bash
# 1. install everything (root + all workspaces)
npm install

# 2. start BOTH the API and the web app together
npm run dev
```

- Web app → **http://localhost:5173**
- API → **http://localhost:4000** (health check: `/api/health`)

The Vite dev server proxies `/api/*` to the Express server, so the browser just
calls `/api/...` with no CORS fuss.

> Run them separately if you prefer: `npm run dev:server` and `npm run dev:client`.

### First steps in the app
1. Open http://localhost:5173 → you're redirected to **/login**.
2. Click **Create an account**, register, and you're in.
3. Browse categories, **♥ Save** a meal, open a meal to **review** it, **Add to
   cart → Checkout**, create your own recipe under **My Recipes**, and try
   **Pantry → What can I make?**.

---

## Project layout

```
CRUD_Exercise/
├─ shared/            # Zod schemas + types shared by client & server
│  └─ schemas.ts
├─ server/            # Express API + SQLite
│  ├─ src/
│  │  ├─ index.ts     # app entry: middleware + routes + error handler
│  │  ├─ db.ts        # SQLite connection + table migrations
│  │  ├─ auth.ts      # bcrypt + JWT sign/verify + requireAuth middleware
│  │  ├─ mealdb.ts    # proxy/normalizer for TheMealDB
│  │  └─ routes/      # auth, meals, favorites, reviews, recipes, orders, pantry
│  └─ foodly.db       # created on first run (git-ignored)
└─ client/            # React app
   └─ src/
      ├─ main.tsx     # providers (Query, Auth, Cart, Toast, Router)
      ├─ App.tsx      # routes
      ├─ lib/         # api client, types, toasts
      ├─ auth/        # AuthContext
      ├─ cart/        # CartContext
      ├─ hooks/       # useFavorites (optimistic updates)
      ├─ components/  # Layout, Sidebar, MealCard, CartPanel, …
      └─ pages/       # Login, Register, Home, MealDetail, Cookbook,
                      # Recipes, Orders, Pantry
```

---

## The two dataflows (the whole point)

1. **External read** — `browser → our Express API → TheMealDB → back`
   (meals, categories, search). We never write to TheMealDB.
2. **Owned CRUD** — `browser form → JWT-protected API → SQLite → back`
   (favorites, reviews, custom recipes, orders, pantry). Every write is yours.

---

## Where each CRUD verb lives (frontend ↔ backend)

| Feature | Create | Read | Update | Delete |
|---|---|---|---|---|
| Favorites (Cookbook) | ♥ on a card | `/cookbook` grid | inline note edit | trash button |
| Reviews | review form | meal detail list | edit your review | delete your review |
| Custom Recipes | “Add recipe” form | `/recipes` grid | “Edit” modal | “Delete” |
| Orders | Checkout | `/orders` list | advance status / cancel | delete |
| Pantry | add ingredient | `/pantry` chips | — | remove ingredient |

Backends for these live in `server/src/routes/*.ts`, each guarded by `requireAuth`
and scoped to the logged-in user.

---

## Reset the database

Stop the server and delete the DB file — it's recreated empty on next start:

```bash
rm server/foodly.db server/foodly.db-shm server/foodly.db-wal
```

## Inspect the database

Open `server/foodly.db` with any SQLite viewer (e.g. the “SQLite Viewer” VS Code
extension) to *watch* rows appear as you click around the app.

---

## Notes & deliberate simplifications
- **Prices are synthetic** — TheMealDB has none, so we derive a stable fake price
  from each meal id (see `priceForMeal` in `server/src/mealdb.ts`).
- **Access-token-only JWT** (no refresh tokens) to keep auth easy to follow.
- **Recipe images use a URL field** (no file uploads) to stay simple.
- The TheMealDB **test key `1`** is fine for development/educational use.
