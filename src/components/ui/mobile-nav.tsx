import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Plus, 
  Shield, 
  LogOut,
  User,
  X 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useEnhancedAuth();
  const { isSuperAdmin } = useUserProfile();

  const menuItems = [
    { 
      title: 'Dashboard', 
      path: '/dashboard', 
      icon: LayoutDashboard,
    },
    { 
      title: 'Add Student', 
      path: '/students/enhanced-add', 
      icon: Plus,
    },
    { 
      title: 'View Students', 
      path: '/students', 
      icon: Users,
    },
    { 
      title: 'Batches', 
      path: '/batches', 
      icon: GraduationCap,
    },
  ];

  const adminMenuItems = [
    { 
      title: 'Administration', 
      path: '/admin/audit-logs', 
      icon: Shield,
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0 w-80">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Dashboard</div>
              <div className="text-sm text-muted-foreground">Navigation</div>
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

        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            {/* Main Menu */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Main Menu
              </h4>
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center px-3 py-3 rounded-lg transition-colors touch-manipulation ${
                      (location.pathname === item.path || 
                       (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')))
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Admin Menu */}
            {isSuperAdmin() && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Administration
                  </h4>
                  <div className="space-y-1">
                    {adminMenuItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={handleLinkClick}
                        className={`flex items-center px-3 py-3 rounded-lg transition-colors touch-manipulation ${
                          location.pathname === item.path
                            ? 'bg-primary text-primary-foreground font-medium' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-4" />
            
            {/* Logout */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}