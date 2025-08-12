
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
  Shield
} from "lucide-react"
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import FixedHeader from './FixedHeader';

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
      icon: LayoutDashboard, 
      colorClass: 'icon-electric-blue hover:text-electric-blue',
      bgClass: 'hover:bg-electric-blue/10'
    },
    { 
      title: 'Add Student', 
      path: '/students/enhanced-add', 
      icon: Plus, 
      colorClass: 'icon-emerald-green hover:text-emerald-green',
      bgClass: 'hover:bg-emerald-green/10'
    },
    { 
      title: 'View Students', 
      path: '/students', 
      icon: Users, 
      colorClass: 'icon-vibrant-purple hover:text-vibrant-purple',
      bgClass: 'hover:bg-vibrant-purple/10'
    },
    { 
      title: 'Batches', 
      path: '/batches', 
      icon: GraduationCap, 
      colorClass: 'icon-sunset-orange hover:text-sunset-orange',
      bgClass: 'hover:bg-sunset-orange/10'
    },
  ];

  // Super Admin specific menu items
  const adminMenuItems = [
    { 
      title: 'Administration', 
      path: '/admin/audit-logs', 
      icon: Shield, 
      colorClass: 'icon-danger-red hover:text-danger-red',
      bgClass: 'hover:bg-danger-red/10'
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
    <SidebarProvider>
      <FixedHeader />
      <div className="pt-16 sm:pt-20 min-h-screen flex w-full bg-background">
        <Sidebar className="bg-card border-r border-border hidden lg:flex lg:w-64 data-[state=collapsed]:lg:w-16"
                 collapsible="icon"
                 variant="sidebar">
          <SidebarHeader className="p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Dashboard</div>
                <div className="text-sm text-muted-foreground">Navigation</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-4 py-6">
            {/* Main Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                            (location.pathname === item.path || 
                             (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')))
                              ? 'bg-primary text-primary-foreground font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <item.icon className="w-5 h-5 mr-3" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Super Admin Menu */}
            {isSuperAdmin() && (
              <SidebarGroup className="mt-6">
                <SidebarGroupContent>
                  <div className="px-4 py-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Administration
                  </div>
                  <SidebarMenu className="space-y-2 mt-3">
                    {adminMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.path}
                            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                              location.pathname === item.path
                                ? 'bg-primary text-primary-foreground font-medium' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            <item.icon className="w-5 h-5 mr-3" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="p-6 border-t border-border">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
