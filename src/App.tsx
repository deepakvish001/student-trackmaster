
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddStudent from "./pages/students/AddStudent";
import ViewStudents from "./pages/students/ViewStudents";
import Batches from "./pages/Batches";
import Downloads from "./pages/Downloads";
import { useAuth } from "./contexts/AuthContext";
import { initSecurityMonitoring } from "./utils/inputSanitization";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Enhanced error handling with security logging
        if (error && typeof error === 'object' && 'message' in error) {
          console.warn('[QUERY_ERROR]', error.message);
        }
        return failureCount < 2; // Limit retries for security
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Prevent excessive requests
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/" />;
}

const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />
    <Route
      path="/"
      element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      }
    />
    <Route
      path="/students/add"
      element={
        <PrivateRoute>
          <AddStudent />
        </PrivateRoute>
      }
    />
    <Route
      path="/students/view"
      element={
        <PrivateRoute>
          <ViewStudents />
        </PrivateRoute>
      }
    />
    <Route
      path="/batches"
      element={
        <PrivateRoute>
          <Batches />
        </PrivateRoute>
      }
    />
    <Route
      path="/downloads"
      element={
        <PrivateRoute>
          <Downloads />
        </PrivateRoute>
      }
    />
  </Routes>
);

const App = () => {
  useEffect(() => {
    // Initialize security monitoring on app start
    initSecurityMonitoring();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
