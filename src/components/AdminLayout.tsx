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
  ArrowLeft,
  Shield,
  Users,
  Settings,
  FileText,
  Activity,
  Bell,
  Menu,
  LogOut,
  User
} from "lucide-react"
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Navigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useEnhancedAuth();
  const { profile, isLoading, isSuperAdmin } = useUserProfile();

  // Check if user has admin access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile || !isSuperAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  const adminMenuItems = [
    { 
      title: 'Audit Logs', 
      path: '/admin/audit-logs', 
      icon: FileText, 
      colorClass: 'icon-electric-blue hover:text-electric-blue',
      bgClass: 'hover:bg-electric-blue/10',
      description: 'View system audit trails'
    },
    { 
      title: 'User Management', 
      path: '/admin/users', 
      icon: Users, 
      colorClass: 'icon-vibrant-purple hover:text-vibrant-purple',
      bgClass: 'hover:bg-vibrant-purple/10',
      description: 'Manage user accounts and roles'
    },
    { 
      title: 'System Settings', 
      path: '/admin/settings', 
      icon: Settings, 
      colorClass: 'icon-emerald-green hover:text-emerald-green',
      bgClass: 'hover:bg-emerald-green/10',
      description: 'Configure system parameters'
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
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="text-foreground">
                <div className="font-poppins font-semibold text-lg text-gradient-primary">Admin Panel</div>
                <div className="text-sm text-muted-foreground">System Management</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-4 py-6">
            {/* Back to Dashboard */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 mb-4">
                  <Link to="/dashboard">
                    <Button 
                      variant="outline"
                      className="w-full justify-start gap-3 h-12 font-medium transition-all duration-300 rounded-xl border-primary/20 text-primary hover:bg-primary/10 hover:shadow-purple-glow"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="font-inter">Back to Dashboard</span>
                    </Button>
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Navigation */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-4 py-2 text-foreground font-poppins font-medium text-sm uppercase tracking-wider opacity-70">
                  Administration
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {adminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={`group flex flex-col items-start px-4 py-4 rounded-xl transition-all duration-300 ${
                            location.pathname === item.path
                              ? `bg-primary/20 border border-primary/30 shadow-glow text-primary font-semibold` 
                              : `text-muted-foreground hover:text-foreground ${item.bgClass} hover:shadow-lg`
                          }`}
                        >
                          <div className="flex items-center w-full">
                            <item.icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${
                              location.pathname === item.path
                                ? 'text-primary' 
                                : item.colorClass
                            }`} />
                            <span className="font-inter font-medium">{item.title}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 ml-8">
                            {item.description}
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-surface-1 border-b border-surface-3 px-8 py-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="lg:hidden p-2 hover:bg-surface-2 rounded-lg transition-colors" />
                <div className="hidden md:flex items-center space-x-2">
                  <Shield className="w-5 h-5 icon-danger-red" />
                  <span className="font-poppins font-semibold text-foreground">Administration Panel</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="relative p-3 hover:bg-surface-2 rounded-xl transition-all duration-300 group"
                >
                  <Bell className="w-5 h-5 icon-sunset-orange group-hover:text-sunset-orange" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse"></span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="p-3 hover:bg-surface-2 rounded-xl transition-all duration-300"
                >
                  <Menu className="w-5 h-5 icon-electric-blue" />
                </Button>
                
                <Button 
                  onClick={handleLogout}
                  variant="ghost" 
                  size="sm"
                  className="px-4 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-300 font-inter font-medium"
                >
                  Logout
                </Button>
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