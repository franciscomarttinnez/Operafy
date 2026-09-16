import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { AuthShell } from '@/components/layout/auth-shell'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/routing/route-guards'
import { AuthProvider } from '@/features/auth/auth-provider'
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page'
import { LoginPage } from '@/features/auth/pages/login-page'
import { ResetPasswordPage } from '@/features/auth/pages/reset-password-page'
import { SignUpPage } from '@/features/auth/pages/signup-page'
import { CustomerDetailPage } from '@/features/customers/pages/customer-detail-page'
import { CustomerEditPage } from '@/features/customers/pages/customer-edit-page'
import { CustomerNewPage } from '@/features/customers/pages/customer-new-page'
import { CustomersListPage } from '@/features/customers/pages/customers-list-page'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { OnboardingPage } from '@/features/organizations/pages/onboarding-page'
import { SettingsPage } from '@/features/organizations/pages/settings-page'
import { PaymentEditPage } from '@/features/payments/pages/payment-edit-page'
import { PaymentNewPage } from '@/features/payments/pages/payment-new-page'
import { PaymentsListPage } from '@/features/payments/pages/payments-list-page'
import { QuoteDetailPage } from '@/features/quotes/pages/quote-detail-page'
import { QuoteEditPage } from '@/features/quotes/pages/quote-edit-page'
import { QuoteNewPage } from '@/features/quotes/pages/quote-new-page'
import { QuotePrintPage } from '@/features/quotes/pages/quote-print-page'
import { QuotesListPage } from '@/features/quotes/pages/quotes-list-page'
import { WorkOrderDetailPage } from '@/features/work-orders/pages/work-order-detail-page'
import { WorkOrderEditPage } from '@/features/work-orders/pages/work-order-edit-page'
import { WorkOrderNewPage } from '@/features/work-orders/pages/work-order-new-page'
import { WorkOrdersListPage } from '@/features/work-orders/pages/work-orders-list-page'
import { LocaleProvider } from '@/i18n/locale-provider'
import { ThemeProvider } from '@/theme/theme-provider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthShell />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      {/* Recovery session must not be bounced by PublicOnlyRoute. */}
      <Route element={<AuthShell />}>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/quotes/:quoteId/print" element={<QuotePrintPage />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersListPage />} />
          <Route path="/customers/new" element={<CustomerNewPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="/customers/:customerId/edit" element={<CustomerEditPage />} />
          <Route path="/quotes" element={<QuotesListPage />} />
          <Route path="/quotes/new" element={<QuoteNewPage />} />
          <Route path="/quotes/:quoteId" element={<QuoteDetailPage />} />
          <Route path="/quotes/:quoteId/edit" element={<QuoteEditPage />} />
          <Route path="/work-orders" element={<WorkOrdersListPage />} />
          <Route path="/work-orders/new" element={<WorkOrderNewPage />} />
          <Route path="/work-orders/:workOrderId" element={<WorkOrderDetailPage />} />
          <Route path="/work-orders/:workOrderId/edit" element={<WorkOrderEditPage />} />
          <Route path="/payments" element={<PaymentsListPage />} />
          <Route path="/payments/new" element={<PaymentNewPage />} />
          <Route path="/payments/:paymentId/edit" element={<PaymentEditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
