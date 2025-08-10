import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient as TanstackQueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { withLazyLoading, preloadComponent } from "@/utils/lazyLoading";

// Lazy load non-critical routes for better performance
const Index = withLazyLoading(() => import("./pages/Index"), 'page');
const Dashboard = withLazyLoading(() => import("./pages/Dashboard"), 'page');
const Batches = withLazyLoading(() => import("./pages/Batches"), 'page');
const AddStudent = withLazyLoading(() => import("./pages/students/AddStudent"), 'page');
const EnhancedAddStudent = withLazyLoading(() => import("./pages/students/EnhancedAddStudent"), 'page');
const StudentList = withLazyLoading(() => import("./pages/students/StudentList"), 'page');

// Admin routes - lazy load since they're used less frequently
const UserManagementPage = withLazyLoading(() => import("./pages/admin/UserManagement"), 'page');
const AuditLogs = withLazyLoading(() => import("./pages/admin/AuditLogs"), 'page');
const SystemSettings = withLazyLoading(() => import("./pages/admin/SystemSettings"), 'page');
import Login from "./pages/Login"; // Keep login synchronous for immediate access
import { EnhancedAuthProvider } from "./contexts/EnhancedAuthContext";
import { useGlobalPerformanceOptimization } from "./hooks/useGlobalPerformanceOptimization";
import ProtectedRoute from "./components/ProtectedRoute";
import SecurityWrapper from "./components/SecurityWrapper";
import { SuperAdminRoute, UserRoute } from "./components/RoleBasedRoute";
import { OfflineStatusIndicator } from "./components/ui/offline-status-indicator";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { usePWA } from "./hooks/usePWA";

function App() {
  return (
    <QueryClient>
      <AppWithQueryClient />
    </QueryClient>
  );
}

function AppWithQueryClient() {
  // Initialize global performance optimization
  useGlobalPerformanceOptimization();
  
  // Initialize PWA features
  usePWA();
  
  // Preload critical routes on user interaction
  React.useEffect(() => {
    const preloadCriticalRoutes = () => {
      preloadComponent(() => import("./pages/Dashboard"));
      preloadComponent(() => import("./pages/students/EnhancedAddStudent"));
    };
    
    // Preload on first user interaction
    const handleFirstInteraction = () => {
      preloadCriticalRoutes();
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    
    window.addEventListener('mousedown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    
    return () => {
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  return (
    <BrowserRouter>
      <EnhancedAuthProvider>
        <TooltipProvider>
          <Toaster />
          
          {/* Fixed UI elements for offline capabilities */}
          <div className="fixed top-4 right-4 z-50">
            <OfflineStatusIndicator />
          </div>
          <PWAInstallBanner />
          
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
            staleTime: 5 * 60 * 1000, // 5 minutes for normal operation
            gcTime: 30 * 60 * 1000, // 30 minutes cache time for offline access
            refetchOnWindowFocus: true, // Re-enable for security validation
            refetchOnMount: true, // Re-enable for fresh data  
            refetchOnReconnect: true, // Re-enable for network security
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors except 408 (timeout)
              if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
                return false;
              }
              return failureCount < 2; // Max 2 retries for other errors
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            networkMode: 'offlineFirst', // Enable offline-first queries
          },
          mutations: {
            retry: 1, // Only retry mutations once
            networkMode: 'online', // Mutations need to be online
            onError: (error: any) => {
              console.error('Mutation failed:', error);
              // Don't show errors for offline mutations - they'll be queued
            }
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
