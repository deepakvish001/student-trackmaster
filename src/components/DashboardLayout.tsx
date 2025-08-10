
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
  Shield,
  Menu,
  Home,
  ChevronRight
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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const menuItems = [
    { 
      title: 'Dashboard', 
      path: '/dashboard', 
      icon: LayoutDashboard
    },
    { 
      title: 'Add Student', 
      path: '/students/enhanced-add', 
      icon: Plus
    },
    { 
      title: 'View Students', 
      path: '/students', 
      icon: Users
    },
    { 
      title: 'Batches', 
      path: '/batches', 
      icon: GraduationCap
    },
  ];

  // Admin menu items
  const adminMenuItems = isSuperAdmin() ? [
    { 
      title: 'Administration', 
      path: '/admin/audit-logs', 
      icon: Shield
    },
  ] : [];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* AdminLTE Style Sidebar */}
        <Sidebar className="w-60" style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}>
          <SidebarHeader className="p-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-white">
                <div className="font-semibold text-sm">AdminLTE USER</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <div className="p-4">
              <div className="text-white/70 text-xs font-medium mb-3 uppercase tracking-wide">
                User
              </div>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.path}
                        className={`flex items-center px-3 py-2 text-sm rounded transition-colors ${
                          (location.pathname === item.path || 
                           (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')))
                            ? 'bg-blue-600 text-white' 
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>

              {/* Administration section for super admins */}
              {adminMenuItems.length > 0 && (
                <div className="mt-6">
                  <div className="text-white/70 text-xs font-medium mb-3 uppercase tracking-wide">
                    Administration
                  </div>
                  <SidebarMenu>
                    {adminMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.path}
                            className={`flex items-center px-3 py-2 text-sm rounded transition-colors ${
                              location.pathname === item.path
                                ? 'bg-blue-600 text-white' 
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <item.icon className="w-4 h-4 mr-3" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              )}
            </div>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-white/10">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="lg:hidden">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
            </div>
            
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link to="/" className="text-blue-600 hover:text-blue-800">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span>Dashboard</span>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 bg-gray-100 p-6">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="bg-white border-t px-6 py-4 flex items-center justify-between text-sm text-gray-600">
            <div>
              Copyright © 2014-2021 <a href="#" className="text-blue-600 hover:text-blue-800">AdminLTE.io</a>. All rights reserved.
            </div>
            <div>
              Version 3.2.0
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
