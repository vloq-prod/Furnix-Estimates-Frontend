import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { tokenStore } from '@/lib/api';

const SignIn = lazy(() => import('@/pages/SignIn'));
const EstimateDashboard = lazy(() => import('@/pages/EstimateDashboard'));
const AllEstimates = lazy(() => import('@/pages/AllEstimates'));
const EstimateCreate = lazy(() => import('@/pages/EstimateCreate'));
const EstimateEdit = lazy(() => import('@/pages/EstimateEdit'));
const EstimateDetail = lazy(() => import('@/pages/EstimateDetail'));
const EstimatePreview = lazy(() => import('@/pages/EstimatePreview'));
const ModuleMaster = lazy(() => import('@/pages/ModuleMaster'));
const TermsMaster = lazy(() => import('@/pages/TermsMaster'));
const PricingSettings = lazy(() => import('@/pages/PricingSettings'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (!tokenStore.get()) return <Navigate to="/sign-in" replace />;
  if (isLoading) return <Spinner label="Checking your session" />;
  if (!user) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/estimates/new" replace />} />
            <Route path="/estimates" element={<EstimateDashboard />} />
            <Route path="/estimates/all" element={<AllEstimates />} />
            <Route path="/estimates/new" element={<EstimateCreate />} />
            <Route path="/estimates/:id" element={<EstimateDetail />} />
            <Route path="/estimates/:id/edit" element={<EstimateEdit />} />
            <Route path="/estimates/:id/preview" element={<EstimatePreview />} />
            <Route path="/modules" element={<ModuleMaster />} />
            <Route path="/terms" element={<TermsMaster />} />
            <Route path="/settings" element={<PricingSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/estimates/new" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
