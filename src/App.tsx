
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { EnhancedAuthProvider } from '@/contexts/EnhancedAuthContext';
import Dashboard from '@/pages/Dashboard';
import { AddStudent } from '@/pages/students/AddStudent';
import Login from '@/pages/Login';
import { GlobalRDServiceProvider } from '@/contexts/GlobalRDServiceContext';

const queryClient = new QueryClient();

// Placeholder components for missing pages
const Students = () => <div className="p-4">Students Page - Coming Soon</div>;
const EditStudent = () => <div className="p-4">Edit Student Page - Coming Soon</div>;
const ViewStudent = () => <div className="p-4">View Student Page - Coming Soon</div>;
const Teachers = () => <div className="p-4">Teachers Page - Coming Soon</div>;
const AddTeacher = () => <div className="p-4">Add Teacher Page - Coming Soon</div>;
const EditTeacher = () => <div className="p-4">Edit Teacher Page - Coming Soon</div>;
const ViewTeacher = () => <div className="p-4">View Teacher Page - Coming Soon</div>;
const Courses = () => <div className="p-4">Courses Page - Coming Soon</div>;
const AddCourse = () => <div className="p-4">Add Course Page - Coming Soon</div>;
const EditCourse = () => <div className="p-4">Edit Course Page - Coming Soon</div>;
const ViewCourse = () => <div className="p-4">View Course Page - Coming Soon</div>;
const Batches = () => <div className="p-4">Batches Page - Coming Soon</div>;
const AddBatch = () => <div className="p-4">Add Batch Page - Coming Soon</div>;
const EditBatch = () => <div className="p-4">Edit Batch Page - Coming Soon</div>;
const ViewBatch = () => <div className="p-4">View Batch Page - Coming Soon</div>;
const Attendance = () => <div className="p-4">Attendance Page - Coming Soon</div>;
const Settings = () => <div className="p-4">Settings Page - Coming Soon</div>;
const ForgotPassword = () => <div className="p-4">Forgot Password Page - Coming Soon</div>;
const ResetPassword = () => <div className="p-4">Reset Password Page - Coming Soon</div>;
const Error404 = () => <div className="p-4">404 - Page Not Found</div>;
const Error500 = () => <div className="p-4">500 - Internal Server Error</div>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalRDServiceProvider>
        <BrowserRouter>
          <EnhancedAuthProvider>
            <Toaster />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Students */}
              <Route path="/students" element={<Students />} />
              <Route path="/students/add" element={<AddStudent />} />
              <Route path="/students/edit/:id" element={<EditStudent />} />
              <Route path="/students/view/:id" element={<ViewStudent />} />

              {/* Teachers */}
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/teachers/add" element={<AddTeacher />} />
              <Route path="/teachers/edit/:id" element={<EditTeacher />} />
              <Route path="/teachers/view/:id" element={<ViewTeacher />} />

              {/* Courses */}
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/add" element={<AddCourse />} />
              <Route path="/courses/edit/:id" element={<EditCourse />} />
              <Route path="/courses/view/:id" element={<ViewCourse />} />

              {/* Batches */}
              <Route path="/batches" element={<Batches />} />
              <Route path="/batches/add" element={<AddBatch />} />
              <Route path="/batches/edit/:id" element={<EditBatch />} />
              <Route path="/batches/view/:id" element={<ViewBatch />} />

              {/* Attendance */}
              <Route path="/attendance" element={<Attendance />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />

              {/* Authentication */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Errors */}
              <Route path="/error-404" element={<Error404 />} />
              <Route path="/error-500" element={<Error500 />} />
              <Route path="*" element={<Error404 />} />
            </Routes>
          </EnhancedAuthProvider>
        </BrowserRouter>
      </GlobalRDServiceProvider>
    </QueryClientProvider>
  );
}

export default App;
