import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Home, Users, BookOpen, Download, LogOut, UserPlus, List } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { title: 'Dashboard', icon: Home, path: '/dashboard' },
    {
      title: 'Student List',
      icon: Users,
      submenu: [
        { title: 'Add Student', icon: UserPlus, path: '/students/add' },
        { title: 'View Student', icon: List, path: '/students/view' },
      ],
    },
    { title: 'Batch List', icon: BookOpen, path: '/batches' },
    { title: 'Download', icon: Download, path: '/downloads' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="bg-[#1A1F2C] text-white">
          <div className="px-4 py-4 bg-[#8B5CF6]">
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <div className="px-4 py-3 bg-[#221F26] text-white/70">
            <span>User</span>
          </div>
          <SidebarContent className="overflow-y-auto">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    item.submenu ? (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton className="w-full hover:bg-[#2A2F3E] text-white">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {item.submenu.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.path}>
                              <SidebarMenuSubButton asChild>
                                <Link
                                  to={subItem.path}
                                  className={`${location.pathname === subItem.path ? 'bg-[#2A2F3E]' : ''} text-white hover:bg-[#2A2F3E]`}
                                >
                                  <subItem.icon className="w-4 h-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </SidebarMenuItem>
                    ) : (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.path}
                            className={`${location.pathname === item.path ? 'bg-[#2A2F3E]' : ''} text-white hover:bg-[#2A2F3E]`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 bg-[#ecf0f5] flex flex-col">
          <header className="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <SidebarTrigger className="md:hidden" />
              <Link to="/" className="text-blue-600 hover:underline">Home</Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900 capitalize">
                {location.pathname.split('/').pop()?.replace('-', ' ')}
              </span>
            </div>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>

          <footer className="mt-auto border-t border-gray-200 p-4 text-center text-sm text-gray-600 bg-white">
            <p>© 2014-2024 Admin Dashboard. All rights reserved.</p>
            <p>Version 3.2.0</p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}