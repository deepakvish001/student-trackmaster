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
  ArrowLeft,
  Shield,
  Users,
  Settings,
  FileText,
  LogOut
} from "lucide-react"
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Navigate } from 'react-router-dom';
import FixedHeader from './FixedHeader';

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
      <FixedHeader title="Admin Panel" subtitle="System Management" />
      <div className="pt-20 min-h-screen flex w-full bg-background">
        <Sidebar className="bg-card border-r border-border">
          <SidebarHeader className="p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Admin Panel</div>
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
                      className="w-full justify-start gap-3 h-12 font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Dashboard</span>
                    </Button>
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Menu */}
            <SidebarGroup>
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
                          className={`flex flex-col items-start px-4 py-4 rounded-lg transition-colors ${
                            location.pathname === item.path
                              ? 'bg-primary text-primary-foreground font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center w-full">
                            <item.icon className="w-5 h-5 mr-3" />
                            <span>{item.title}</span>
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

        <main className="flex-1 overflow-auto bg-background p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}