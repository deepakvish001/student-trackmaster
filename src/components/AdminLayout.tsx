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
      description: 'Track system activities',
      badge: '24',
      color: 'text-blue-500'
    },
    { 
      title: 'User Management', 
      path: '/admin/users', 
      icon: Users, 
      description: 'Manage users & permissions',
      badge: '12',
      color: 'text-purple-500'
    },
    { 
      title: 'System Settings', 
      path: '/admin/settings', 
      icon: Settings, 
      description: 'Configure system parameters',
      badge: '',
      color: 'text-emerald-500'
    },
  ];

  const quickActions = [
    { title: 'Database', icon: Database, color: 'text-orange-500' },
    { title: 'Security', icon: Key, color: 'text-red-500' },
    { title: 'Analytics', icon: BarChart3, color: 'text-cyan-500' },
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
          <SidebarHeader className="p-6 border-b border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse"></div>
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <div className="font-bold text-lg text-foreground flex items-center gap-2">
                      Admin Control
                      <Badge variant="secondary" className="text-xs">Pro</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">System Management Hub</div>
                  </div>
                )}
              </div>
              <SidebarTrigger 
                className="w-8 h-8 rounded-lg hover:bg-muted/50 transition-colors" 
                onClick={() => setIsCollapsed(!isCollapsed)}
              />
            </div>
            
            {!isCollapsed && (
              <div className="mt-4 p-3 bg-muted/30 rounded-xl border border-border/30">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
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
                    className="w-full justify-start gap-3 h-11 font-medium transition-all duration-200 hover:shadow-md border-border/50 hover:border-primary/20"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {!isCollapsed && <span>Back to Dashboard</span>}
                  </Button>
                </Link>
              </SidebarGroupContent>
            </SidebarGroup>

            <Separator className="opacity-20" />

            {/* Quick Actions */}
            {!isCollapsed && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <div className="px-2 mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Quick Actions
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 hover:scale-105 group"
                        onClick={() => setActiveSection(action.title)}
                      >
                        <action.icon className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} />
                        <span className="text-xs font-medium mt-1 text-muted-foreground group-hover:text-foreground">
                          {action.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {!isCollapsed && <Separator className="opacity-20" />}

            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupContent>
                {!isCollapsed && (
                  <div className="px-2 mb-4">
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
                            className={`group relative flex items-center px-3 py-3 rounded-xl transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center flex-1 min-w-0">
                              <item.icon className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'} ${item.color} ${isActive ? 'text-primary-foreground' : ''} transition-colors`} />
                              {!isCollapsed && (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{item.title}</div>
                                    <div className={`text-xs truncate mt-0.5 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                      {item.description}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {item.badge && (
                                      <Badge 
                                        variant={isActive ? "secondary" : "outline"} 
                                        className="text-xs px-2 py-0.5"
                                      >
                                        {item.badge}
                                      </Badge>
                                    )}
                                    <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                                  </div>
                                </>
                              )}
                            </div>
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full"></div>
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

          <SidebarFooter className="p-4 border-t border-border/20">
            <div className="space-y-3">
              {!isCollapsed && (
                <div className="px-2 py-3 bg-muted/20 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">System Status</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-emerald-600 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                className={`w-full transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 hover:shadow-md ${
                  isCollapsed ? 'px-0' : 'justify-start'
                }`}
              >
                <LogOut className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && <span>Sign Out</span>}
              </Button>
            </div>
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