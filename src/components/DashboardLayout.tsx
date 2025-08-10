
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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

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
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="bg-surface-1 border-r border-surface-3 shadow-2xl">
          <SidebarHeader className="p-6 border-b border-surface-3">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="text-foreground">
                <div className="font-poppins font-semibold text-lg text-gradient-primary">AdminLTE</div>
                <div className="text-sm text-muted-foreground">Management System</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-4 py-6">
            {/* User Section */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-4 py-2 text-foreground font-poppins font-medium text-sm uppercase tracking-wider opacity-70">
                  Navigation
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Main Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${
                            (location.pathname === item.path || 
                             (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')))
                              ? `bg-primary/20 border border-primary/30 shadow-glow text-primary font-semibold` 
                              : `text-muted-foreground hover:text-foreground ${item.bgClass} hover:shadow-lg`
                          }`}
                        >
                          <item.icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${
                            (location.pathname === item.path || 
                             (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')))
                              ? 'text-primary' 
                              : item.colorClass
                          }`} />
                          <span className="font-inter font-medium">{item.title}</span>
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
                  <div className="px-4 py-2 text-foreground font-poppins font-medium text-sm uppercase tracking-wider opacity-70">
                    Administration
                  </div>
                  <SidebarMenu className="space-y-2 mt-3">
                    {adminMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.path}
                            className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${
                              location.pathname === item.path
                                ? `bg-primary/20 border border-primary/30 shadow-glow text-primary font-semibold` 
                                : `text-muted-foreground hover:text-foreground ${item.bgClass} hover:shadow-lg`
                            }`}
                          >
                            <item.icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${
                              location.pathname === item.path
                                ? 'text-primary' 
                                : item.colorClass
                            }`} />
                            <span className="font-inter font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

          </SidebarContent>

          <SidebarFooter className="p-6 border-t border-surface-3">
            <div className="space-y-3">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300 rounded-xl h-12"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-inter font-medium">Logout</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Modern Industry-Level Header */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="relative bg-gradient-to-r from-surface-1 via-surface-1/95 to-surface-1 border-b border-surface-3/50 backdrop-blur-xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-electric-blue/5 via-transparent to-emerald-green/5"></div>
            <div className="relative px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <SidebarTrigger 
                    className="lg:hidden p-3 hover:bg-surface-2/80 rounded-xl transition-all duration-300 border border-surface-3/30 backdrop-blur-sm" 
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  />
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-glow-lg">
                          <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-emerald-green animate-pulse" />
                      </div>
                      <div>
                        <div className="font-poppins font-bold text-2xl bg-gradient-to-r from-electric-blue via-emerald-green to-vibrant-purple bg-clip-text text-transparent">
                          BiometricHub
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          Enterprise Biometric Management Platform
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex items-center space-x-3 px-4 py-2 glass rounded-xl border border-surface-3/30">
                    <Activity className="w-5 h-5 text-emerald-green animate-pulse" />
                    <span className="font-inter font-semibold text-foreground text-sm">System Online</span>
                    <div className="w-2 h-2 bg-emerald-green rounded-full animate-pulse"></div>
                  </div>
                  
                  <Button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    variant="ghost"
                    size="sm"
                    className="hidden lg:flex items-center space-x-2 px-4 py-2 glass border border-surface-3/30 hover:bg-surface-2/80 rounded-xl transition-all duration-300"
                  >
                    {sidebarCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-electric-blue" />
                    ) : (
                      <ChevronLeft className="w-4 h-4 text-electric-blue" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {sidebarCollapsed ? 'Expand' : 'Collapse'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto bg-background p-8 animate-fade-in">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
