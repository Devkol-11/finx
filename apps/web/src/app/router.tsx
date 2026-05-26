import { lazy, Suspense, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageSkeleton } from '@/components/common/states';
import { ProtectedRoute, PublicOnlyRoute } from '@/app/guards';
import { RouteErrorBoundary } from '@/app/error-boundary';
import { NotFoundPage } from '@/app/not-found';

const LoginPage = lazy(() => import('@/features/auth/login-page'));
const RegisterPage = lazy(() => import('@/features/auth/register-page'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/forgot-password-page'));
const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page'));
const WithdrawPage = lazy(() => import('@/features/wallet/withdraw-page'));
const TransactionsPage = lazy(() => import('@/features/transactions/transactions-page'));
const SavingsPage = lazy(() => import('@/features/savings/savings-page'));
const SavingsDetailPage = lazy(() => import('@/features/savings/savings-detail-page'));
const KycPage = lazy(() => import('@/features/kyc/kyc-page'));
const ProfilePage = lazy(() => import('@/features/profile/profile-page'));
const SettingsPage = lazy(() => import('@/features/profile/settings-page'));

const lazyPage = (node: ReactNode) => (
  <Suspense fallback={<PageSkeleton />}>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {node}
    </motion.div>
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      {
        path: 'auth',
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { index: true, element: <Navigate to="/auth/login" replace /> },
              { path: 'login', element: lazyPage(<LoginPage />) },
              { path: 'register', element: lazyPage(<RegisterPage />) },
              { path: 'forgot-password', element: lazyPage(<ForgotPasswordPage />) }
            ]
          }
        ]
      },
      {
        path: 'app',
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/app/dashboard" replace /> },
              { path: 'dashboard', element: lazyPage(<DashboardPage />) },
              { path: 'wallet/withdraw', element: lazyPage(<WithdrawPage />) },
              { path: 'transactions', element: lazyPage(<TransactionsPage />) },
              { path: 'savings', element: lazyPage(<SavingsPage />) },
              { path: 'savings/:id', element: lazyPage(<SavingsDetailPage />) },
              { path: 'kyc', element: lazyPage(<KycPage />) },
              { path: 'profile', element: lazyPage(<ProfilePage />) },
              { path: 'settings', element: lazyPage(<SettingsPage />) }
            ]
          }
        ]
      },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);
