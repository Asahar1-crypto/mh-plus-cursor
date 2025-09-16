
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { ExpenseProvider } from "@/contexts/ExpenseContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AccountSettings from "./pages/AccountSettings";
import AccountManagement from "./pages/AccountManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import FamilyInvitation from "./pages/FamilyInvitation";
import FamilyRegister from "./pages/FamilyRegister";
import FamilyPhoneRegister from "./pages/FamilyPhoneRegister";
import FamilyOtp from "./pages/FamilyOtp";
import NotFound from "./pages/NotFound";
import AddExpense from "./pages/AddExpense";
import Children from "./pages/Children";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import MonthlySettlement from "./pages/MonthlySettlement";
import IndexPage from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminEmailSettings from "./pages/admin/AdminEmailSettings";
import AdminUnverifiedUsers from "./pages/admin/AdminUnverifiedUsers";
import AdminSmsLogs from "./pages/admin/AdminSmsLogs";

import AuthLayout from "./components/AuthLayout";
import AppLayout from "./components/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ExpenseProvider>
          <Toaster />
          <Sonner position="top-center" closeButton />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route element={<AuthLayout />}>
                <Route path="/" element={<Home />} />
                {/* Add explicit redirect for /index to prevent issues */}
                <Route path="/index" element={<Navigate to="/" replace />} />
              </Route>
              
              {/* Auth routes */}
              <Route element={<AuthLayout requiresAuth={false} />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/family-invitation" element={<FamilyInvitation />} />
                <Route path="/family-register" element={<FamilyPhoneRegister />} />
                <Route path="/family-otp" element={<FamilyOtp />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
              </Route>
              
              {/* Protected routes */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/account-settings" element={<AccountSettings />} />
                <Route path="/account-management" element={<AccountManagement />} />
                <Route path="/add-expense" element={<AddExpense />} />
                <Route path="/children" element={<Children />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/monthly-settlement" element={<MonthlySettlement />} />
                <Route path="/test-email" element={<IndexPage />} />
                
                {/* Admin routes */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/pricing" element={<AdminPricing />} />
                <Route path="/admin/tenants" element={<AdminTenants />} />
                <Route path="/admin/email-settings" element={<AdminEmailSettings />} />
                <Route path="/admin/unverified-users" element={<AdminUnverifiedUsers />} />
                <Route path="/admin/sms-logs" element={<AdminSmsLogs />} />
              </Route>
              
              {/* Special routes */}
              <Route path="/invitation/:invitationId" element={<AcceptInvitation />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ExpenseProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
