
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
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  LogOut,
  User,
  Plus,
  Shield,
  Home,
  UserPlus,
  Menu
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
  const { isSuperAdmin, profile } = useUserProfile();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { 
      title: 'Dashboard', 
      path: '/dashboard', 
      icon: Home,
      description: 'Overview & analytics'
    },
    { 
      title: 'Add Student', 
      path: '/students/enhanced-add', 
      icon: UserPlus,
      description: 'Register new student'
    },
    { 
      title: 'Students', 
      path: '/students', 
      icon: Users,
      description: 'Manage all students'
    },
    { 
      title: 'Batches', 
      path: '/batches', 
      icon: GraduationCap,
      description: 'Organize student groups'
    },
  ];

  // Super Admin menu items
  const adminMenuItems = [
    { 
      title: 'Admin Panel', 
      path: '/admin/audit-logs', 
      icon: Shield,
      description: 'System administration'
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
      <div className="pt-20 min-h-screen flex w-full bg-background">
        <Sidebar 
          className="bg-card/50 backdrop-blur-sm border-r border-border/30"
          collapsible="icon"
        >
          <SidebarHeader className="p-4 border-b border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
                  <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
                </div>
                {!isCollapsed && (
                  <div>
                    <div className="font-semibold text-foreground">Dashboard</div>
                    <div className="text-xs text-muted-foreground">Main Navigation</div>
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
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {profile?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {profile?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isSuperAdmin() ? 'Administrator' : 'User'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className="px-3 py-4 space-y-6">
            {/* Main Menu */}
            <SidebarGroup>
              <SidebarGroupContent>
                {!isCollapsed && (
                  <div className="px-2 mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Main Menu
                    </h3>
                  </div>
                )}
                <SidebarMenu className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.path || 
                      (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
                    
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

            {/* Super Admin Menu */}
            {isSuperAdmin() && (
              <>
                {!isCollapsed && <Separator className="opacity-30" />}
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
              </>
            )}
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

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
