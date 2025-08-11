import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
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
import { useUltraFastRealTime } from "./hooks/useUltraFastRealTime";
import ProtectedRoute from "./components/ProtectedRoute";
import SecurityWrapper from "./components/SecurityWrapper";
import { SuperAdminRoute, UserRoute } from "./components/RoleBasedRoute";

function App() {
  return (
    <QueryClient>
      <AppWithQueryClient />
    </QueryClient>
  );
}

function AppWithQueryClient() {
  // Initialize global performance optimization (now inside QueryClient provider)
  useGlobalPerformanceOptimization();
  
  // Initialize ultra-fast real-time synchronization for immediate data updates
  useUltraFastRealTime();

  return (
    <BrowserRouter>
      <EnhancedAuthProvider>
        <TooltipProvider>
          <OfflineBanner />
          <PWAInstallPrompt />
          <Toaster />
          <Routes>
            {/* Public route - Login only */}
            <Route path="/login" element={<Login />} />
            
            {/* All other routes require authentication and security validation */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <Dashboard />
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <Dashboard />
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <StudentList />
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/add"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <AddStudent />
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/enhanced-add"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <EnhancedAddStudent />
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/batches"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <Batches />
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes - Super Admin only */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <SuperAdminRoute>
                      <UserManagementPage />
                    </SuperAdminRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <SuperAdminRoute>
                      <AuditLogs />
                    </SuperAdminRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <SuperAdminRoute>
                      <SystemSettings />
                    </SuperAdminRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all route - redirect to login for any undefined routes */}
            <Route 
              path="*" 
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <Dashboard />
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </TooltipProvider>
      </EnhancedAuthProvider>
    </BrowserRouter>
  );
}

const QueryClient = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = React.useState(
    () =>
      new TanstackQueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity for security
            gcTime: 10 * 60 * 1000, // 10 minutes instead of Infinity for security
            refetchOnWindowFocus: true, // Re-enable for security validation
            refetchOnMount: true, // Re-enable for fresh data
            refetchOnReconnect: true, // Re-enable for network security
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
