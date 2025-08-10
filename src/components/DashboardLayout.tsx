
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  LogOut,
  User,
  Plus,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  Building2,
  Sparkles
} from "lucide-react"
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useEnhancedAuth();
  const { isSuperAdmin } = useUserProfile();

  const menuItems = [
    { 
      title: 'Dashboard', 
      path: '/dashboard', 
      icon: LayoutDashboard
    },
    { 
      title: 'Student List', 
      path: '/students', 
      icon: Users
    },
    { 
      title: 'Batch List', 
      path: '/batches', 
      icon: GraduationCap
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <div className="w-64 adminlte-sidebar flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <div className="font-semibold text-white">AdminLTE USER</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-gray-700">
          <div className="text-sm text-gray-300">User</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${
                    location.pathname === item.path || 
                    (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'))
                      ? 'active bg-gray-700' 
                      : ''
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.title}</span>
                </Link>
              </li>
            ))}
            {isSuperAdmin() && (
              <li>
                <Link
                  to="/admin/system-settings"
                  className={`nav-link ${
                    location.pathname === '/admin/system-settings' ? 'active bg-gray-700' : ''
                  }`}
                >
                  <Shield className="w-5 h-5 mr-3" />
                  <span>Administration</span>
                </Link>
              </li>
            )}
            <li>
              <a href="#" className="nav-link">
                <Activity className="w-5 h-5 mr-3" />
                <span>Download</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col adminlte-content">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Breadcrumb Navigation */}
              <nav className="breadcrumb">
                <Link to="/" className="breadcrumb-item text-blue-500">Home</Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">
                  {location.pathname === '/dashboard' || location.pathname === '/' ? 'Dashboard' :
                   location.pathname === '/students' ? 'Student List' :
                   location.pathname === '/batches' ? 'Add Batch' :
                   location.pathname === '/admin/system-settings' ? 'System Settings' :
                   'Page'}
                </span>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 hover:text-blue-500 cursor-pointer">Logout</span>
              <Button variant="ghost" size="sm">
                <Building2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
