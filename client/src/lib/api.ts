/**
 * THE API CLIENT  (how the browser talks to our server)
 * -----------------------------------------------------
 * We use `axios` with two "interceptors" — little hooks that run on every
 * request/response:
 *
 *   REQUEST interceptor:  automatically attaches the JWT as
 *                         `Authorization: Bearer <token>` so we never have to
 *                         remember to add it by hand on each call.
 *
 *   RESPONSE interceptor: if the server ever replies 401 (token missing/expired)
 *                         we clear the token and bounce the user to /login.
 *
 * The token lives in localStorage so a page refresh keeps you logged in.
 * (Trade-off discussed in LEARN.md.)
 */
import axios from "axios";

const TOKEN_KEY = "foodly_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// baseURL "/api" works because Vite proxies /api -> the Express server.
export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      // Avoid redirect loops if we're already on an auth page.
      if (!location.pathname.startsWith("/login") && !location.pathname.startsWith("/register")) {
        location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Pull a human-friendly message out of an axios error (used by toasts).
export function errMessage(e: any, fallback = "Something went wrong"): string {
  return (
    e?.response?.data?.error ||
    e?.response?.data?.issues?.[0]?.message ||
    e?.message ||
    fallback
  );
}
