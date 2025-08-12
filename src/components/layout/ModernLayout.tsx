import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CommandPalette } from '@/components/ui/command-palette';
import { SmartSidebar } from '@/components/ui/smart-sidebar';
import { NotificationCenter } from '@/components/ui/notification-center';
import { EnhancedBreadcrumb } from '@/components/ui/enhanced-breadcrumb';
import { ActivityIndicator, RealTimeStatus } from '@/components/ui/activity-indicator';
import { RealTimeClock } from '@/components/ui/real-time-clock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Menu, 
  Settings, 
  User, 
  LogOut, 
  Monitor,
  Zap,
  Command
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

interface ModernLayoutProps {
  children?: React.ReactNode;
}

export function ModernLayout({ children }: ModernLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isOnline } = useOnlineStatus();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // Generate breadcrumb items from current route
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [
      { label: 'Dashboard', path: '/' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Custom labels
      switch (segment) {
        case 'students': label = 'Students'; break;
        case 'batches': label = 'Batches'; break;
        case 'admin': label = 'Administration'; break;
        case 'settings': label = 'Settings'; break;
        case 'add': label = 'Add New'; break;
      }

      items.push({
        label,
        path: index === pathSegments.length - 1 ? undefined : currentPath
      });
    });

    return items;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Command Palette */}
      <CommandPalette 
        open={showCommandPalette} 
        onOpenChange={setShowCommandPalette} 
      />

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={cn(
          'border-r border-border transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
          isMobile && 'absolute z-50 h-full'
        )}>
          <SmartSidebar 
            defaultCollapsed={sidebarCollapsed}
            onCollapseChange={setSidebarCollapsed}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header Bar */}
          <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between h-full px-6">
              {/* Left Section */}
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="h-9 w-9 p-0"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}

                {/* Breadcrumb */}
                <div className="hidden md:block">
                  <EnhancedBreadcrumb 
                    items={generateBreadcrumbs()}
                    showBackButton={false}
                    showHomeButton={false}
                  />
                </div>
              </div>

              {/* Center Section - Global Search */}
              <div className="flex-1 max-w-md mx-8 hidden lg:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search everything... (⌘K)"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onFocus={() => setShowCommandPalette(true)}
                    className="pl-9 pr-12 h-9 bg-muted/50"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      <Command className="h-3 w-3 mr-1" />
                      K
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-3">
                {/* Real-time Status */}
                <div className="hidden md:flex items-center space-x-3">
                  <RealTimeStatus 
                    isOnline={isOnline} 
                    isSyncing={false}
                    lastSync={new Date(Date.now() - 5 * 60 * 1000)}
                  />
                  
                  <ActivityIndicator 
                    status="processing"
                    label="Active"
                    size="sm"
                  />
                </div>

                {/* System Monitoring */}
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Monitor className="h-4 w-4" />
                </Button>

                {/* Notifications */}
                <NotificationCenter />

                {/* Performance Indicator */}
                <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-md bg-emerald-green/10 border border-emerald-green/20">
                  <Zap className="h-3 w-3 text-emerald-green" />
                  <span className="text-xs font-medium text-emerald-green">Fast</span>
                </div>

                {/* Real-time Clock */}
                <div className="hidden xl:block">
                  <RealTimeClock 
                    showDate={false}
                    showSeconds={false}
                    format="12h"
                    className="text-sm"
                  />
                </div>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              {children || <Outlet />}
            </div>
          </main>

          {/* Optional Footer/Status Bar */}
          <footer className="h-8 border-t border-border bg-muted/30 px-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>Student Track Master v2.0</span>
            <div className="flex items-center space-x-4">
              <span>Performance: Excellent</span>
              <span>Memory: 45MB</span>
              <span>Sync: Active</span>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
}

export default ModernLayout;