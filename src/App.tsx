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
  const { session, profile, orgId, role, loading, authError } = useAuth();

  console.log('[Router] state:', {
    hasSession: !!session,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    profile: profile ? { id: profile.id, email: profile.email } : null,
    orgId,
    role,
    loading,
    authError,
  });

  // 1. Still loading — show spinner
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

  // 2. No session → auth page
  if (!session) {
    console.log('[Router] no session — showing auth page');
    return <AuthPage />;
  }

  // 3. Session exists but there was a profile/data error → show error, NOT login
  if (authError) {
    console.log('[Router] session exists but auth error:', authError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
          <h1 className="text-lg font-semibold text-foreground">Account Setup Error</h1>
          <p className="text-sm text-muted-foreground">{authError}</p>
          <p className="text-xs text-muted-foreground">You are signed in as {session.user.email}. This is not a login issue — your profile data could not be loaded.</p>
        </div>
      </div>
    );
  }

  // 4. Logged in but no org → create org page (do NOT redirect to auth!)
  if (!orgId) {
    console.log('[Router] session exists, no organization — showing create organization');
    return <CreateOrgPage />;
  }

  // 5. Fully authenticated with org → dashboard routes
  const homeRoute = role === 'va' ? '/tasks' : '/';
  console.log('[Router] redirecting to dashboard — role:', role, 'home:', homeRoute);

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={role === 'va' ? <Navigate to="/tasks" replace /> : <Dashboard />} />
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
