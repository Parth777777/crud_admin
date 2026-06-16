/**
 * ROUTES — maps each URL to a screen.
 *   /login, /register  -> public auth pages
 *   everything else    -> wrapped in <ProtectedRoute> + the app <Layout>
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { Layout } from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import MealDetailPage from "./pages/MealDetailPage";
import CookbookPage from "./pages/CookbookPage";
import RecipesPage from "./pages/RecipesPage";
import OrdersPage from "./pages/OrdersPage";
import PantryPage from "./pages/PantryPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/meal/:id" element={<MealDetailPage />} />
        <Route path="/cookbook" element={<CookbookPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/pantry" element={<PantryPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
