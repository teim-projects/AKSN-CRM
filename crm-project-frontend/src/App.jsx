import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Login from "./components/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./components/Register";
import ProfileSection from "./components/ProfileSection";
import ForgotPassword from "./components/ForgotPassword";
import ResetPasswordConfirm from "./components/ResetPasswordConfirm";
import Sidebar from "./components/Sidebar";
import Accounts from "./pages/Accounts";
import Customer from "./pages/Customer";
import Lead from "./pages/Lead";
import Quotation from "./pages/Quotation";
import Project from "./pages/Project";

import ProductList from './components/products/ProductList';
import ProductForm from './components/products/ProductForm';
import CategoryList from './components/products/CategoryList';
import FollowUp from "./components/lead/FollowUp";
import TermsCategoriesList from "./components/terms_conditions/TermsCategoriesList";
import TermsCategoryForm from "./components/terms_conditions/TermsCategoryForm";
import TermsForm from "./components/terms_conditions/TermsForm";

import RolesPage from "./pages/RolesPage";
import { useUserRole } from "./hooks/useAuth";

function ModuleProtectedRoute({ module, action = "view", children }) {
  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const { isLoading, hasPermission } = useUserRole(baseApi);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-sans text-sm">
        Verifying permissions...
      </div>
    );
  }

  if (!hasPermission(module, action)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const location = useLocation();
  const noNavPaths = ["/login", "/register", "/forgot-password"];
  const isLoggedIn = !!localStorage.getItem("access");

  const hideLayout =
    !isLoggedIn ||
    noNavPaths.includes(location.pathname) ||
    location.pathname.startsWith("/password-reset-confirm/");

  const renderRoutes = () => (
    <Routes>
      <Route
        path="/"
        element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<ProfileSection />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/password-reset-confirm/:uid/:token" element={<ResetPasswordConfirm />} />

      {/* Dynamic Role-Protected Routes */}
      <Route
        path="/accounts"
        element={
          <ModuleProtectedRoute module="accounts">
            <Accounts />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ModuleProtectedRoute module="roles">
            <RolesPage />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/customer"
        element={
          <ModuleProtectedRoute module="customers">
            <Customer />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <Project />
        }
      />
      <Route
        path="/leads"
        element={
          <ModuleProtectedRoute module="leads">
            <Lead />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/quotation"
        element={
          <ModuleProtectedRoute module="quotations">
            <Quotation />
          </ModuleProtectedRoute>
        }
      />

      {/* Product Routes */}
      <Route
        path="/products"
        element={
          <ModuleProtectedRoute module="products">
            <ProductList />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/products/add"
        element={
          <ModuleProtectedRoute module="products" action="create">
            <ProductForm />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/products/edit/:id"
        element={
          <ModuleProtectedRoute module="products" action="edit">
            <ProductForm />
          </ModuleProtectedRoute>
        }
      />

      {/* Category Routes */}
      <Route
        path="/categories"
        element={
          <ModuleProtectedRoute module="products">
            <CategoryList />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/categories/add"
        element={
          <ModuleProtectedRoute module="products" action="create">
            <CategoryList />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/categories/edit/:id"
        element={
          <ModuleProtectedRoute module="products" action="edit">
            <CategoryList />
          </ModuleProtectedRoute>
        }
      />

      {/* Follow-up Routes */}
      <Route
        path="/follow-up"
        element={
          <ModuleProtectedRoute module="followups">
            <FollowUp />
          </ModuleProtectedRoute>
        }
      />

      {/* Terms Routes */}
      <Route
        path="/terms"
        element={
          <ModuleProtectedRoute module="terms">
            <TermsCategoriesList />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/terms/add-category"
        element={
          <ModuleProtectedRoute module="terms" action="create">
            <TermsCategoryForm />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/terms/edit-category/:id"
        element={
          <ModuleProtectedRoute module="terms" action="edit">
            <TermsCategoryForm />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/terms/add-term"
        element={
          <ModuleProtectedRoute module="terms" action="create">
            <TermsForm />
          </ModuleProtectedRoute>
        }
      />
      <Route
        path="/terms/edit-term/:id"
        element={
          <ModuleProtectedRoute module="terms" action="edit">
            <TermsForm />
          </ModuleProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );

  if (hideLayout) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 font-sans antialiased">
        {renderRoutes()}
      </div>
    );
  }

  return (
    <Sidebar>
      {renderRoutes()}
    </Sidebar>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}