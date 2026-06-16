/**
 * LAYOUT — the persistent app shell: left sidebar nav, top search bar, the
 * routed page in the middle (<Outlet/>), and the cart panel on the right.
 * Matches the Foodly reference: icon sidebar, green accent, rounded cards.
 */
import { NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { CartPanel } from "./CartPanel";
import {
  HomeIcon,
  BookIcon,
  ChefIcon,
  BagIcon,
  PantryIcon,
  LogoutIcon,
  SearchIcon,
  ShieldIcon,
} from "./icons";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/", label: "Discover", icon: HomeIcon, end: true },
  { to: "/cookbook", label: "Cookbook", icon: BookIcon },
  { to: "/recipes", label: "My Recipes", icon: ChefIcon },
  { to: "/pantry", label: "Pantry", icon: PantryIcon },
  { to: "/orders", label: "Orders", icon: BagIcon },
];

export function Layout() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q") || "";

  // SEARCH-AS-YOU-TYPE
  // `term` updates instantly so the input feels responsive, but we DEBOUNCE
  // (wait 300ms after the last keystroke) before pushing it into the URL's
  // ?q= param. HomePage reads that param, so the meal grid refetches live —
  // without firing a request on every single letter.
  const [term, setTerm] = useState(q);

  // Keep the input in sync if q changes from elsewhere (e.g. "Clear search").
  useEffect(() => setTerm(q), [q]);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed === q) return; // nothing changed -> no navigation
    const id = setTimeout(() => {
      navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
    }, 300);
    return () => clearTimeout(id); // cancel if another key is pressed first
  }, [term, q, navigate]);

  // Is a meal query (search or category) currently in flight? -> show a spinner.
  const searching = useIsFetching({ queryKey: ["meals"] }) > 0;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault(); // Enter still works; debounce already handled the typing.
    const trimmed = term.trim();
    navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <nav className="flex w-20 flex-col items-center gap-2 border-r border-slate-100 bg-white py-6 lg:w-60 lg:items-stretch lg:px-4">
        <div className="mb-6 flex items-center justify-center gap-2 lg:justify-start lg:px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-xl font-extrabold text-white">F</span>
          <span className="hidden text-xl font-extrabold lg:block">Foodly</span>
        </div>

        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition lg:justify-start ${
                isActive
                  ? "bg-brand-500 text-white shadow-card"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <Icon />
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}

        {/* Admin link — only rendered for admins */}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition lg:justify-start ${
                isActive
                  ? "bg-brand-500 text-white shadow-card"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <ShieldIcon />
            <span className="hidden lg:block">Admin</span>
          </NavLink>
        )}

        <div className="mt-auto hidden lg:block">
          <div className="rounded-2xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2 flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 lg:justify-start"
        >
          <LogoutIcon />
          <span className="hidden lg:block">Log out</span>
        </button>
      </nav>

      {/* MAIN COLUMN */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-slate-100 bg-white px-6 py-4">
          <form onSubmit={submitSearch} className="relative flex-1 max-w-xl">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input px-11"
              placeholder="Search meals… (e.g. Arrabiata, chicken)"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            {/* Live loading spinner while results are being fetched */}
            {searching && (
              <span
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500"
                aria-label="Searching"
              />
            )}
          </form>
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-brand-50 px-3 py-1.5 font-semibold text-brand-700">
              Cart · {cart.count}
            </span>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto px-6 py-6">
            <Outlet />
          </main>
          <CartPanel />
        </div>
      </div>
    </div>
  );
}
