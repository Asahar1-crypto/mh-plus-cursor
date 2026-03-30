import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppRouter } from "@/lib/capacitor-router";
import { AuthProvider } from "@/contexts/auth";
import { ExpenseProvider } from "@/contexts/ExpenseContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationPermissionPrompt } from "@/components/notifications";

// Eagerly loaded pages (landing/auth for fast first paint)
import Home from "./pages/Home";
import Login from "./pages/Login";

// Lazy-loaded page components
const Register = React.lazy(() => import("./pages/Register"));
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const AccountSettings = React.lazy(() => import("./pages/AccountSettings"));
const AccountManagement = React.lazy(() => import("./pages/AccountManagement"));
const AcceptInvitation = React.lazy(() => import("./pages/AcceptInvitation"));
const FamilyInvitation = React.lazy(() => import("./pages/FamilyInvitation"));
const FamilyPhoneRegister = React.lazy(() => import("./pages/FamilyPhoneRegister"));
const FamilyOtp = React.lazy(() => import("./pages/FamilyOtp"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const AddExpense = React.lazy(() => import("./pages/AddExpense"));
const Children = React.lazy(() => import("./pages/Children"));
const Expenses = React.lazy(() => import("./pages/Expenses"));
const Reports = React.lazy(() => import("./pages/Reports"));
const MonthlySettlement = React.lazy(() => import("./pages/MonthlySettlement"));
const CustodyCalendar = React.lazy(() => import("./pages/CustodyCalendar"));
const BirthdayProjects = React.lazy(() => import("./pages/BirthdayProjects"));
const BirthdayProjectDetail = React.lazy(() => import("./pages/BirthdayProjectDetail"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const ChoosePlan = React.lazy(() => import("./pages/ChoosePlan"));

// Lazy-loaded admin pages
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminPricing = React.lazy(() => import("./pages/admin/AdminPricing"));
const AdminTenants = React.lazy(() => import("./pages/admin/AdminTenants"));
const AdminEmailSettings = React.lazy(() => import("./pages/admin/AdminEmailSettings"));
const AdminUnverifiedUsers = React.lazy(() => import("./pages/admin/AdminUnverifiedUsers"));
const AdminSmsLogs = React.lazy(() => import("./pages/admin/AdminSmsLogs"));
const AdminEmailManagement = React.lazy(() => import("./pages/admin/AdminEmailManagement"));
const AdminCoupons = React.lazy(() => import("./pages/admin/AdminCoupons"));
const AdminSuperAdmins = React.lazy(() => import("./pages/admin/AdminSuperAdmins"));
const AdminSystemHealth = React.lazy(() => import("./pages/admin/AdminSystemHealth"));

// Static imports (non-page components)
import AuthLayout from "./components/AuthLayout";
import AppLayout from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthAwareThemeProvider } from "./components/AuthAwareThemeProvider";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
            <Suspense fallback={<LoadingSpinner />}>
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
                <Route path="/birthday-projects" element={<BirthdayProjects />} />
                <Route path="/birthday-projects/:id" element={<BirthdayProjectDetail />} />
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
            </Suspense>
            </AppRouter>
          </ExpenseProvider>
        </NotificationProvider>
        </AuthAwareThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
