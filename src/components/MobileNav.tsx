import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  LogOut,
  Plus,
  Shield
} from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { logout } = useEnhancedAuth();
  const { isSuperAdmin } = useUserProfile();

  const menuItems = [
    { 
      title: 'Dashboard', 
      path: '/dashboard', 
      icon: LayoutDashboard
    },
    { 
      title: 'Add Student', 
      path: '/students/enhanced-add', 
      icon: Plus
    },
    { 
      title: 'View Students', 
      path: '/students', 
      icon: Users
    },
    { 
      title: 'Batches', 
      path: '/batches', 
      icon: GraduationCap
    },
  ];

  const adminMenuItems = [
    { 
      title: 'Administration', 
      path: '/admin/audit-logs', 
      icon: Shield
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="lg:hidden p-2 h-9 w-9"
          size="sm"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">Dashboard</div>
                <div className="text-xs text-muted-foreground">Navigation</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-6 py-6 space-y-6">
            {/* Main Menu */}
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`flex items-center px-3 py-3 rounded-lg transition-colors text-sm font-medium ${
                    (location.pathname === item.path || 
                     (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')))
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>

            {/* Admin Menu */}
            {isSuperAdmin() && (
              <div className="space-y-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Administration
                </div>
                {adminMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={`flex items-center px-3 py-3 rounded-lg transition-colors text-sm font-medium ${
                      location.pathname === item.path
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 text-sm"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}