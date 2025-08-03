
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EnhancedAuthProvider } from "./contexts/EnhancedAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Batches from "./pages/Batches";
import ViewStudents from "./pages/students/ViewStudents";
import StudentDetails from "./pages/students/StudentDetails";
import SuperFastAddStudent from "./pages/students/SuperFastAddStudent";
import EnhancedAddStudent from "./pages/students/EnhancedAddStudent";
import Downloads from "./pages/Downloads";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <EnhancedAuthProvider>
            <Toaster />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/batches" element={
                <ProtectedRoute>
                  <Batches />
                </ProtectedRoute>
              } />
              
              <Route path="/students" element={
                <ProtectedRoute>
                  <ViewStudents />
                </ProtectedRoute>
              } />
              
              <Route path="/students/:fingerprintId" element={
                <ProtectedRoute>
                  <StudentDetails />
                </ProtectedRoute>
              } />
              
              <Route path="/add-student" element={
                <ProtectedRoute>
                  <SuperFastAddStudent />
                </ProtectedRoute>
              } />
              
              <Route path="/students/enhanced-add" element={
                <ProtectedRoute>
                  <EnhancedAddStudent />
                </ProtectedRoute>
              } />
              
              <Route path="/downloads" element={
                <ProtectedRoute>
                  <Downloads />
                </ProtectedRoute>
              } />
            </Routes>
          </EnhancedAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
