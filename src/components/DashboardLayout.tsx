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
  Menu,
  Bell,
  LayoutDashboard,
  Users,
  GraduationCap,
  Download,
  TestTube,
  LogOut,
  User,
  Plus
} from "lucide-react"
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useEnhancedAuth();

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Student List', path: '/students/list', icon: Users },
    { title: 'View Students', path: '/students', icon: Users },
    { title: 'Batches', path: '/batches', icon: GraduationCap },
    { title: 'Downloads', path: '/downloads', icon: Download },
    { title: 'Testing', path: '/testing', icon: TestTube },
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="bg-[#1E2532] border-r border-gray-700">
          <SidebarHeader className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-[#1E2532]" />
              </div>
              <div className="text-white">
                <div className="font-medium">AdminLTE USER</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {/* User Section */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-4 py-2 text-white font-medium">User</div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Main Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={`${(location.pathname === item.path || (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'))) ? 'bg-[#2A2F3E]' : ''} text-white hover:bg-[#2A2F3E]`}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Add New Student Button */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 py-2">
                  <Link to="/students/enhanced-add">
                    <Button 
                      className={`w-full justify-start gap-3 h-12 text-white border-2 transition-all duration-200 ${
                        location.pathname === '/students/enhanced-add' 
                          ? 'bg-[#8B5CF6] border-[#8B5CF6] shadow-lg' 
                          : 'bg-transparent border-[#8B5CF6] hover:bg-[#8B5CF6] hover:shadow-md'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                      <span className="font-medium">Add New Student</span>
                    </Button>
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-gray-700">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-white hover:bg-[#2A2F3E]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm">
                  <Menu className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleLogout}
                  variant="ghost" 
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Logout
                </Button>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
