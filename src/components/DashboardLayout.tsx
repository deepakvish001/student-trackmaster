import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Home, Users, BookOpen, Download, LogOut, UserPlus, List } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { title: 'Dashboard', icon: Home, path: '/dashboard' },
    { title: 'Add Student', icon: UserPlus, path: '/students/add' },
    { title: 'View Students', icon: List, path: '/students/view' },
    { title: 'Batches', icon: BookOpen, path: '/batches' },
    { title: 'Downloads', icon: Download, path: '/downloads' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold">AdminLTE USER</h1>
          </div>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={location.pathname === item.path ? 'bg-accent' : ''}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1">
          <header className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Home</span>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900">{location.pathname.substring(1)}</span>
            </div>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </header>

          <main className="p-6">{children}</main>

          <footer className="border-t border-gray-200 p-4 text-center text-sm text-gray-600">
            <p>© 2014-2024 AdminLTE.io. All rights reserved.</p>
            <p>Version 3.2.0</p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}