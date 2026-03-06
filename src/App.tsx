import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "./pages/Auth";
import CreateOrgPage from "./pages/CreateOrg";
import Dashboard from "./pages/Dashboard";
import VADetail from "./pages/VADetail";
import TasksPage from "./pages/Tasks";
import TeamPage from "./pages/Team";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { session, orgId, role, loading, authError } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center animate-pulse">
            <span className="text-primary font-bold">VA</span>
          </div>
          <p className="text-muted-foreground text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    console.log('[Auth] no session found');
    return <AuthPage />;
  }

  console.log('[Auth] session found', session.user.id);

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold text-foreground mb-2">Login setup error</h1>
          <p className="text-sm text-muted-foreground">{authError}</p>
        </div>
      </div>
    );
  }

  if (!orgId) return <CreateOrgPage />;

  const homeRoute = role === 'va' ? '/va-dashboard' : '/dashboard';
  console.log('[Auth] redirecting to dashboard', homeRoute);

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to={homeRoute} replace />} />
        <Route path="/dashboard" element={role === 'va' ? <Navigate to="/va-dashboard" replace /> : <Dashboard />} />
        <Route path="/va-dashboard" element={role === 'va' ? <TasksPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/va/:id" element={<VADetail />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/team" element={role === 'va' ? <Navigate to={homeRoute} replace /> : <TeamPage />} />
        <Route path="/reports" element={role === 'va' ? <Navigate to={homeRoute} replace /> : <ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
