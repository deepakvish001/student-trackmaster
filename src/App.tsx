import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'sonner';

import { AuthProvider as EnhancedAuthProvider } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/students/Students';
import { AddStudent } from '@/pages/students/AddStudent';
import EditStudent from '@/pages/students/EditStudent';
import ViewStudent from '@/pages/students/ViewStudent';
import Teachers from '@/pages/teachers/Teachers';
import AddTeacher from '@/pages/teachers/AddTeacher';
import EditTeacher from '@/pages/teachers/EditTeacher';
import ViewTeacher from '@/pages/teachers/ViewTeacher';
import Courses from '@/pages/courses/Courses';
import AddCourse from '@/pages/courses/AddCourse';
import EditCourse from '@/pages/courses/EditCourse';
import ViewCourse from '@/pages/courses/ViewCourse';
import Batches from '@/pages/batches/Batches';
import AddBatch from '@/pages/batches/AddBatch';
import EditBatch from '@/pages/batches/EditBatch';
import ViewBatch from '@/pages/batches/ViewBatch';
import Attendance from '@/pages/attendance/Attendance';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Error404 from '@/pages/Error404';
import Error500 from '@/pages/Error500';
import { GlobalRDServiceProvider } from '@/contexts/GlobalRDServiceContext';

const queryClient = new QueryClient();

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
