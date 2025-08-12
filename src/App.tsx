import React, { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAFeatureCenter } from "@/components/PWAFeatureCenter";
import { CollaborationIndicator } from "@/components/CollaborationIndicator";
import { MobileOptimizedLayout } from "@/components/MobileOptimizedLayout";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { QueryClient as TanstackQueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EnhancedAuthProvider } from "./contexts/EnhancedAuthContext";
import { SafePerformanceWrapper } from "@/components/SafePerformanceWrapper";
import { PerformanceInitializer } from "@/components/PerformanceInitializer";
import { GlobalRealTimeProvider } from "@/components/GlobalRealTimeProvider";
import { UnifiedSyncControl } from "@/components/UnifiedSyncControl";
import ProtectedRoute from "./components/ProtectedRoute";
import SecurityWrapper from "./components/SecurityWrapper";
import { SuperAdminRoute, UserRoute } from "./components/RoleBasedRoute";

// Lazy load page components for better code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Batches = lazy(() => import("./pages/Batches"));
const AddStudent = lazy(() => import("./pages/students/AddStudent"));
const EnhancedAddStudent = lazy(() => import("./pages/students/EnhancedAddStudent"));
const StudentList = lazy(() => import("./pages/students/StudentList"));
const UserManagementPage = lazy(() => import("./pages/admin/UserManagement"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const PWASettings = lazy(() => import("./pages/PWASettings"));

// Loading component for suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <QueryClient>
      <AppWithQueryClient />
    </QueryClient>
  );
}

function AppWithQueryClient() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Get the service worker registration
    const checkRegistration = () => {
      const registration = (window as any).swRegistration;
      if (registration) {
        setSwRegistration(registration);
      }
    };

    // Check immediately and then periodically
    checkRegistration();
    const interval = setInterval(checkRegistration, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <EnhancedAuthProvider>
        <GlobalRealTimeProvider>
          <SafePerformanceWrapper>
            <PerformanceInitializer />
            <TooltipProvider>
            <MobileOptimizedLayout>
              <OfflineBanner />
              <div className="fixed top-4 right-4 z-50 space-y-2 safe-area-inset-top safe-area-inset-right">
                <CollaborationIndicator />
              </div>
              <PWAInstallPrompt />
              <PWAUpdatePrompt registration={swRegistration} />
              <UnifiedSyncControl variant="floating" />
              <Toaster />
          <Routes>
            {/* Public route - Login only */}
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
            
            {/* All other routes require authentication and security validation */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <StudentList />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <AddStudent />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <EnhancedAddStudent />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <Batches />
                      </Suspense>
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              }
            />
            
            {/* PWA Settings route */}
            <Route
              path="/pwa"
              element={
                <ProtectedRoute>
                  <SecurityWrapper>
                    <UserRoute>
                      <Suspense fallback={<PageLoader />}>
                        <PWASettings />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <UserManagementPage />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <AuditLogs />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <SystemSettings />
                      </Suspense>
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
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    </UserRoute>
                  </SecurityWrapper>
                </ProtectedRoute>
              } 
            />
            </Routes>
            </MobileOptimizedLayout>
          </TooltipProvider>
        </SafePerformanceWrapper>
      </GlobalRealTimeProvider>
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
