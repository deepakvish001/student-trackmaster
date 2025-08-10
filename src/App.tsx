import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient as TanstackQueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Batches from "./pages/Batches";
import AddStudent from "./pages/students/AddStudent";
import EnhancedAddStudent from "./pages/students/EnhancedAddStudent";
import StudentList from "./pages/students/StudentList";
import UserManagementPage from "./pages/admin/UserManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import SystemSettings from "./pages/admin/SystemSettings";
import { EnhancedAuthProvider } from "./contexts/EnhancedAuthContext";
import { useGlobalPerformanceOptimization } from "./hooks/useGlobalPerformanceOptimization";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  // Initialize global performance optimization
  useGlobalPerformanceOptimization();

  return (
    <QueryClient>
      <BrowserRouter>
        <EnhancedAuthProvider>
          <Toaster />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute>
                  <StudentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/add"
              element={
                <ProtectedRoute>
                  <AddStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/enhanced-add"
              element={
                <ProtectedRoute>
                  <EnhancedAddStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batches"
              element={
                <ProtectedRoute>
                  <Batches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <SystemSettings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </EnhancedAuthProvider>
      </BrowserRouter>
    </QueryClient>
  );
}

const QueryClient = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = React.useState(
    () =>
      new TanstackQueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // Never consider data stale globally
            gcTime: Infinity, // Keep in cache forever globally
            refetchOnWindowFocus: false, // Never refetch on window focus
            refetchOnMount: false, // Never refetch when component mounts
            refetchOnReconnect: false, // Never refetch on network reconnect
            retry: 1, // Only retry once
          },
          mutations: {
            retry: 1, // Only retry mutations once
            networkMode: 'online', // Only run when online
          },
        },
      }),
  );

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  );
};

export default App;
