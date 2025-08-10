import React, { useState } from 'react';
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Shield,
  Users,
  Settings,
  FileText,
  LogOut,
  ChevronRight,
  Activity,
  Database,
  Key,
  Menu,
  User,
  BarChart3
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
  const [activeSection, setActiveSection] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      icon: Activity, 
      description: 'Track system activities'
    },
    { 
      title: 'User Management', 
      path: '/admin/users', 
      icon: Users, 
      description: 'Manage users & permissions'
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
        <Sidebar 
          className="bg-gradient-to-b from-card to-card/80 border-r border-border/50 backdrop-blur-sm"
          collapsible="icon"
        >
          <SidebarHeader className="p-4 border-b border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                {!isCollapsed && (
                  <div>
                    <div className="font-semibold text-foreground">Admin Panel</div>
                    <div className="text-xs text-muted-foreground">System Management</div>
                  </div>
                )}
              </div>
              <SidebarTrigger 
                className="w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors" 
                onClick={() => setIsCollapsed(!isCollapsed)}
              />
            </div>
            
            {!isCollapsed && profile && (
              <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {profile?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {profile?.full_name || 'Admin User'}
                    </div>
                    <div className="text-xs text-muted-foreground">Super Administrator</div>
                  </div>
                </div>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className="px-3 py-4 space-y-6">
            {/* Quick Navigation */}
            <SidebarGroup>
              <SidebarGroupContent>
                <Link to="/dashboard" className="block">
                  <Button 
                    variant="outline"
                    className="w-full justify-start gap-3 h-10 font-medium transition-all duration-200 hover:shadow-sm border-border/50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {!isCollapsed && <span>Back to Dashboard</span>}
                  </Button>
                </Link>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isCollapsed && <Separator className="opacity-20" />}

            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupContent>
                {!isCollapsed && (
                  <div className="px-2 mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Administration
                    </h3>
                  </div>
                )}
                <SidebarMenu className="space-y-1">
                  {adminMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.path}
                            className={`group flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            <item.icon className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'} transition-colors`} />
                            {!isCollapsed && (
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{item.title}</div>
                                <div className={`text-xs truncate ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {item.description}
                                </div>
                              </div>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border/20">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className={`w-full transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 ${
                isCollapsed ? 'px-0' : 'justify-start'
              }`}
            >
              <LogOut className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
              {!isCollapsed && <span>Sign Out</span>}
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}