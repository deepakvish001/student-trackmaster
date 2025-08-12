
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
        <Sidebar className="bg-card border-r border-border hidden lg:flex lg:w-64 data-[state=collapsed]:lg:w-24"
                 collapsible="icon"
                 variant="sidebar">
          <SidebarHeader className="p-4 border-b border-border group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:px-0">
            <div className="flex items-center justify-center group-data-[collapsible=icon]:justify-center">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:rounded-lg">
                <User className="w-5 h-5 text-primary-foreground group-data-[collapsible=icon]:w-5 group-data-[collapsible=icon]:h-5" />
              </div>
              <div className="ml-3 group-data-[collapsible=icon]:hidden">
                <div className="font-semibold text-foreground">Dashboard</div>
                <div className="text-sm text-muted-foreground">Navigation</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4">
            {/* Main Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-3 group-data-[collapsible=icon]:space-y-2">
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild>
                              <Link
                                to={item.path}
                                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-lg ${
                                  (location.pathname === item.path || 
                                   (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')))
                                    ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm'
                                }`}
                              >
                                <item.icon className="w-5 h-5 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:mr-0 mr-3 flex-shrink-0" />
                                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Super Admin Menu */}
            {isSuperAdmin() && (
              <SidebarGroup className="mt-6">
                <SidebarGroupContent>
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                    Administration
                  </div>
                  <SidebarMenu className="space-y-3 mt-3 group-data-[collapsible=icon]:space-y-2">
                    {adminMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton asChild>
                                <Link
                                  to={item.path}
                                  className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-lg ${
                                    location.pathname === item.path
                                      ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                                      : 'text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm'
                                  }`}
                                >
                                  <item.icon className="w-5 h-5 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:mr-0 mr-3 flex-shrink-0" />
                                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:px-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:mr-0 mr-3 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="group-data-[collapsible=icon]:block hidden">
                  Logout
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
