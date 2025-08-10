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
      description: 'View system audit trails'
    },
    { 
      title: 'User Management', 
      path: '/admin/users', 
      icon: Users,
      description: 'Manage user accounts and roles'
    },
    { 
      title: 'System Settings', 
      path: '/admin/settings', 
      icon: Settings,
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
        <Sidebar className="bg-card border-r border-border" collapsible="icon">
          <SidebarHeader className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground text-sm truncate">Admin Panel</div>
                <div className="text-xs text-muted-foreground truncate">Management</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            {/* Back to Dashboard */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-1 mb-2">
                  <Link to="/dashboard">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-sm font-medium"
                    >
                      <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Back to Dashboard</span>
                    </Button>
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Administration
                </div>
                <SidebarMenu className="space-y-1">
                  {adminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={`flex flex-col items-start px-3 py-3 rounded-md transition-colors ${
                            location.pathname === item.path
                              ? 'bg-primary text-primary-foreground font-medium' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center w-full">
                            <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{item.title}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 ml-7 line-clamp-2">
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

          <SidebarFooter className="p-2 border-t border-border">
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="truncate">Logout</span>
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