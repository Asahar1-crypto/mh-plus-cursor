import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppRouter } from "@/lib/capacitor-router";
import { AuthProvider } from "@/contexts/auth";
import { ExpenseProvider } from "@/contexts/ExpenseContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationPermissionPrompt } from "@/components/notifications";

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
import FamilyPhoneRegister from "./pages/FamilyPhoneRegister";
import FamilyOtp from "./pages/FamilyOtp";
import NotFound from "./pages/NotFound";
import AddExpense from "./pages/AddExpense";
import Children from "./pages/Children";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import MonthlySettlement from "./pages/MonthlySettlement";
import CustodyCalendar from "./pages/CustodyCalendar";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Pricing from "./pages/Pricing";
import ChoosePlan from "./pages/ChoosePlan";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminTenants from "./pages/admin/AdminTenants";
import AdminEmailSettings from "./pages/admin/AdminEmailSettings";
import AdminUnverifiedUsers from "./pages/admin/AdminUnverifiedUsers";
import AdminSmsLogs from "./pages/admin/AdminSmsLogs";
import AdminEmailManagement from "./pages/admin/AdminEmailManagement";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminSuperAdmins from "./pages/admin/AdminSuperAdmins";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";

import AuthLayout from "./components/AuthLayout";
import AppLayout from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthAwareThemeProvider } from "./components/AuthAwareThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <AuthAwareThemeProvider>
        <NotificationProvider>
          <ExpenseProvider>
            <Toaster />
            <Sonner position="top-center" closeButton />
            <NotificationPermissionPrompt />
            <AppRouter>
            <Routes>
              {/* Public routes */}
              <Route element={<AuthLayout />}>
                <Route path="/" element={<Home />} />
                {/* Add explicit redirect for /index to prevent issues */}
                <Route path="/index" element={<Navigate to="/" replace />} />
              </Route>
              
              {/* Public pricing page */}
              <Route element={<AuthLayout requiresAuth={false} />}>
                <Route path="/pricing" element={<Pricing />} />
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
                <Route path="/custody-calendar" element={<CustodyCalendar />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/monthly-settlement" element={<MonthlySettlement />} />
                <Route path="/choose-plan" element={<ChoosePlan />} />
                
                {/* Admin routes */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/pricing" element={<AdminPricing />} />
                <Route path="/admin/tenants" element={<AdminTenants />} />
                <Route path="/admin/email-settings" element={<AdminEmailSettings />} />
                <Route path="/admin/unverified-users" element={<AdminUnverifiedUsers />} />
                <Route path="/admin/sms-logs" element={<AdminSmsLogs />} />
                <Route path="/admin/email-management" element={<AdminEmailManagement />} />
                <Route path="/admin/coupons" element={<AdminCoupons />} />
                <Route path="/admin/super-admins" element={<AdminSuperAdmins />} />
                <Route path="/admin/system-health" element={<AdminSystemHealth />} />
              </Route>
              
              {/* Special routes - wrapped in AuthLayout for proper auth context */}
              <Route element={<AuthLayout requiresAuth={false} />}>
                <Route path="/invitation/:invitationId" element={<AcceptInvitation />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
              </Route>
              
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AppRouter>
          </ExpenseProvider>
        </NotificationProvider>
        </AuthAwareThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
