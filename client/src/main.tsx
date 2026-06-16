/**
 * APP ENTRYPOINT — wraps the whole app in the "providers" it needs:
 *
 *   QueryClientProvider  -> React Query: caching + refetching for all our reads,
 *                           and optimistic updates for our writes.
 *   AuthProvider         -> who is logged in.
 *   CartProvider         -> the local shopping cart.
 *   ToastProvider        -> little success/error popups.
 *   BrowserRouter        -> client-side routing (URL <-> screen).
 *
 * The React Query Devtools (bottom corner) let you SEE the cache and watch
 * data flow as you click around — great for learning.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { ToastProvider } from "./lib/toast";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
