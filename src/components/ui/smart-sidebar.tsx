import React, { useState, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Users, 
  FileText, 
  Settings, 
  BarChart,
  Search,
  Plus,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: number;
  children?: SidebarItem[];
}

interface SmartSidebarProps {
  items?: SidebarItem[];
  className?: string;
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const defaultItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/'
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    path: '/students',
    children: [
      { id: 'add-student', label: 'Add Student', icon: Plus, path: '/students/add' },
      { id: 'student-list', label: 'Student List', icon: Users, path: '/students' }
    ]
  },
  {
    id: 'batches',
    label: 'Batches',
    icon: FileText,
    path: '/batches'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart,
    path: '/analytics'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/admin/settings'
  }
];

export function SmartSidebar({ 
  items = defaultItems, 
  className,
  defaultCollapsed = false,
  onCollapseChange
}: SmartSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const location = useLocation();

  const toggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isItemActive = (item: SidebarItem) => {
    return location.pathname === item.path;
  };

  const isItemExpanded = (item: SidebarItem) => {
    return expandedItems.has(item.id) || 
           (item.children?.some(child => location.pathname.startsWith(child.path)) ?? false);
  };

  const filteredItems = items.filter(item =>
    searchQuery === '' || 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.children?.some(child => child.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Auto-expand parent items when a child is active
  useEffect(() => {
    items.forEach(item => {
      if (item.children?.some(child => location.pathname.startsWith(child.path))) {
        setExpandedItems(prev => new Set([...prev, item.id]));
      }
    });
  }, [location.pathname, items]);

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const Icon = item.icon;
    const isActive = isItemActive(item);
    const isExpanded = isItemExpanded(item);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="space-y-1">
        <div
          className={cn(
            'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
            level > 0 && 'ml-6',
            isActive 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            'hover:scale-[1.02]'
          )}
        >
          <NavLink
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center flex-1 space-x-3',
              isActive ? 'text-primary' : ''
            )}
          >
            <Icon className={cn(
              'h-4 w-4 transition-colors',
              isActive ? 'text-primary' : 'group-hover:text-accent-foreground'
            )} />
            {!collapsed && (
              <span className="truncate">{item.label}</span>
            )}
          </NavLink>

          {!collapsed && (
            <div className="flex items-center space-x-1">
              {item.badge && item.badge > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleItemExpansion(item.id);
                  }}
                >
                  <ChevronRight className={cn(
                    'h-3 w-3 transition-transform',
                    isExpanded && 'rotate-90'
                  )} />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="ml-3 space-y-1 border-l border-border pl-3">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex flex-col h-full transition-all duration-300 border-r border-border bg-background',
      collapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredItems.map(item => renderSidebarItem(item))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed ? (
          <div className="text-xs text-muted-foreground text-center">
            Student Track Master
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}