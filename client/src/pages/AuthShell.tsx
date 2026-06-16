/** Shared split-screen layout for the login/register pages. */
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: branded food panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-2xl font-extrabold">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 text-2xl">F</span>
          Foodly
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold leading-tight">
            Cook it. Rate it.
            <br /> Order it.
          </h2>
          <p className="mt-4 max-w-sm text-brand-50/90">
            Discover thousands of recipes, save your favorites, rate the ones you
            love, create your own dishes, and order in — all in one place.
          </p>
        </div>
        {/* Decorative soft glows */}
        <div className="pointer-events-none absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-10 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
        <p className="relative z-10 text-sm text-brand-50/70">Recipes by TheMealDB</p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="card w-full max-w-md p-8">
          <div className="mb-6 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-2xl font-extrabold text-white">F</span>
          </div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
