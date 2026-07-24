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

import ProductList from './components/products/ProductList';
import ProductForm from './components/products/ProductForm';
import CategoryList from './components/products/CategoryList';
import FollowUp from "./components/lead/FollowUp";

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
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/customer" element={<Customer />} />
      <Route path="/leads" element={<Lead />} />
      
      <Route path="/quotation" element={<Quotation />} />
      <Route path="/quotation/add" element={<Quotation />} />
      <Route path="/quotation/edit/:id" element={<Quotation />} />

      {/* Product Routes */}
      <Route path="/products" element={<ProductList />} />
      <Route path="/products/add" element={<ProductForm />} />
      <Route path="/products/edit/:id" element={<ProductForm />} />
      
      {/* Category Routes */}
      <Route path="/categories" element={<CategoryList />} />
      <Route path="/categories/add" element={<CategoryList />} />
      <Route path="/categories/edit/:id" element={<CategoryList />} />
      <Route path="/follow-up" element={<FollowUp />} />
      
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