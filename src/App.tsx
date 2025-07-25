
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EnhancedAuthProvider } from "@/contexts/EnhancedAuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Batches from "./pages/Batches";
import AddStudent from "./pages/students/AddStudent";
import EnhancedAddStudent from "./pages/students/EnhancedAddStudent";
import ViewStudents from "./pages/students/ViewStudents";
import Downloads from "./pages/Downloads";
import Testing from "./pages/Testing";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EnhancedAuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
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
              path="/students/view" 
              element={
                <ProtectedRoute>
                  <ViewStudents />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/downloads" 
              element={
                <ProtectedRoute>
                  <Downloads />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/testing" 
              element={
                <ProtectedRoute>
                  <Testing />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </EnhancedAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
