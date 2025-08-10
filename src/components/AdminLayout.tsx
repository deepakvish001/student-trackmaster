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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  Shield,
  Users,
  Settings,
  FileText,
  LogOut,
  Menu,
  User
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
      iconColor: 'text-electric-blue',
      description: 'View system audit trails'
    },
    { 
      title: 'User Management', 
      path: '/admin/users', 
      icon: Users, 
      iconColor: 'text-vibrant-purple',
      description: 'Manage user accounts and roles'
    },
    { 
      title: 'System Settings', 
      path: '/admin/settings', 
      icon: Settings, 
      iconColor: 'text-emerald-green',
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
    <TooltipProvider>
      <SidebarProvider>
        <FixedHeader title="Admin Panel" subtitle="System Management" />
        <div className="pt-20 min-h-screen flex w-full bg-background">
          <ModernAdminSidebar 
            adminMenuItems={adminMenuItems}
            handleLogout={handleLogout}
            location={location}
            profile={profile}
          />

          <main className="flex-1 overflow-auto bg-background">
            <div className="h-full p-6 lg:p-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}

interface ModernAdminSidebarProps {
  adminMenuItems: any[];
  handleLogout: () => void;
  location: any;
  profile: any;
}

function ModernAdminSidebar({ adminMenuItems, handleLogout, location, profile }: ModernAdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar 
      className={`
        ${collapsed ? 'w-16' : 'w-64'} 
        bg-black border-r border-white/10 transition-all duration-300 ease-in-out
        shadow-2xl backdrop-blur-xl
      `}
      collapsible="icon"
    >
      {/* Header with Brand */}
      <SidebarHeader className="px-4 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-sunset-orange to-coral-red rounded-xl flex items-center justify-center shadow-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <div className="font-bold text-white text-lg">Admin Panel</div>
                <div className="text-xs text-white/60">System Management</div>
              </div>
            )}
          </div>
          <SidebarTrigger className="text-white/60 hover:text-sunset-orange transition-colors" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6 space-y-6">
        {/* Quick Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className={`${collapsed ? 'px-0' : 'px-3'} mb-4`}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/dashboard">
                      <Button 
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 text-white/70 hover:text-sunset-orange hover:bg-sunset-orange/10 transition-all duration-200"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-black/90 text-white border-white/10">
                    Back to Dashboard
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link to="/dashboard">
                  <Button 
                    variant="ghost"
                    className="w-full justify-start gap-3 h-11 text-white/70 hover:text-sunset-orange hover:bg-sunset-orange/10 transition-all duration-200 rounded-xl"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="animate-fade-in">Back to Dashboard</span>
                  </Button>
                </Link>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Menu Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            {!collapsed && (
              <div className="px-3 mb-4">
                <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Administration
                </div>
                <div className="w-full h-px bg-gradient-to-r from-sunset-orange/30 to-transparent mt-2"></div>
              </div>
            )}
            
            <SidebarMenu className="space-y-2">
              {adminMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                
                if (collapsed) {
                  return (
                    <SidebarMenuItem key={item.path}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <Link
                              to={item.path}
                              className={`
                                flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200
                                ${isActive 
                                  ? 'bg-sunset-orange text-white shadow-glow' 
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                                }
                              `}
                            >
                              <item.icon className="w-5 h-5" />
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-black/90 text-white border-white/10">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-white/60 mt-1">{item.description}</div>
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.path}
                        className={`
                          group flex items-center px-4 py-3 rounded-xl transition-all duration-200 animate-fade-in
                          ${isActive 
                            ? 'bg-sunset-orange text-white shadow-glow font-medium' 
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                          }
                        `}
                      >
                        <item.icon className={`w-5 h-5 mr-3 ${item.iconColor} ${isActive ? 'text-white' : ''}`} />
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-white/50'}`}>
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Profile and Logout */}
      <SidebarFooter className="px-3 py-4 border-t border-white/10">
        {/* User Profile Section */}
        {!collapsed && profile && (
          <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-vibrant-purple to-electric-blue rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm truncate">
                  {profile.display_name || 'Admin User'}
                </div>
                <div className="text-xs text-white/50 truncate">Super Administrator</div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="w-10 h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-black/90 text-white border-white/10">
              Logout
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 h-11 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 rounded-xl animate-fade-in"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}