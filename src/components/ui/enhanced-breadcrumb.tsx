import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<any>;
  isActive?: boolean;
  dropdown?: Array<{
    label: string;
    path: string;
    icon?: React.ComponentType<any>;
  }>;
}

interface EnhancedBreadcrumbProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  showHomeButton?: boolean;
  className?: string;
  separator?: React.ComponentType<any>;
  maxItems?: number;
}

export function EnhancedBreadcrumb({
  items,
  showBackButton = true,
  showHomeButton = true,
  className,
  separator: Separator = ChevronRight,
  maxItems = 4
}: EnhancedBreadcrumbProps) {
  const navigate = useNavigate();

  // Collapse breadcrumb items if too many
  const displayItems = items.length > maxItems 
    ? [
        items[0], // Always show first item
        { label: '...', path: undefined }, // Ellipsis
        ...items.slice(-(maxItems - 2)) // Show last few items
      ]
    : items;

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {/* Back Button */}
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="h-8 w-8 p-0"
          title="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Home Button */}
      {showHomeButton && (
        <Link to="/">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </Button>
        </Link>
      )}

      {/* Breadcrumb Items */}
      <nav className="flex items-center space-x-1" aria-label="Breadcrumb">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const Icon = item.icon;

          // Handle ellipsis item
          if (item.label === '...') {
            return (
              <React.Fragment key={index}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      ...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {items.slice(1, -(maxItems - 2)).map((hiddenItem, hiddenIndex) => {
                      const HiddenIcon = hiddenItem.icon;
                      return (
                        <DropdownMenuItem key={hiddenIndex} asChild>
                          <Link 
                            to={hiddenItem.path || '#'}
                            className="flex items-center space-x-2"
                          >
                            {HiddenIcon && <HiddenIcon className="h-4 w-4" />}
                            <span>{hiddenItem.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                {!isLast && <Separator className="h-4 w-4 text-muted-foreground" />}
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={index}>
              {/* Breadcrumb Item */}
              <div className="flex items-center">
                {item.dropdown && item.dropdown.length > 0 ? (
                  // Dropdown breadcrumb item
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 px-2 flex items-center space-x-1',
                          isLast || item.isActive
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {item.dropdown.map((dropdownItem, dropdownIndex) => {
                        const DropdownIcon = dropdownItem.icon;
                        return (
                          <DropdownMenuItem key={dropdownIndex} asChild>
                            <Link 
                              to={dropdownItem.path}
                              className="flex items-center space-x-2"
                            >
                              {DropdownIcon && <DropdownIcon className="h-4 w-4" />}
                              <span>{dropdownItem.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : item.path ? (
                  // Regular linked breadcrumb item
                  <Link to={item.path}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 px-2 flex items-center space-x-1',
                        isLast || item.isActive
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ) : (
                  // Non-linked breadcrumb item (current page)
                  <div className={cn(
                    'h-8 px-2 flex items-center space-x-1',
                    'text-foreground font-medium'
                  )}>
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.label}</span>
                  </div>
                )}
              </div>

              {/* Separator */}
              {!isLast && (
                <Separator className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
}

// Hook to generate breadcrumb items from route
export function useBreadcrumb() {
  const navigate = useNavigate();

  const generateFromPath = (pathname: string): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/', icon: Home }
    ];

    let currentPath = '';
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Generate human-readable labels
      let label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Custom labels for specific routes
      switch (segment) {
        case 'students':
          label = 'Students';
          break;
        case 'batches':
          label = 'Batches';
          break;
        case 'admin':
          label = 'Administration';
          break;
        case 'settings':
          label = 'Settings';
          break;
        case 'add':
          label = 'Add New';
          break;
      }

      const isLast = index === segments.length - 1;
      
      items.push({
        label,
        path: isLast ? undefined : currentPath, // Don't link the current page
        isActive: isLast
      });
    });

    return items;
  };

  const navigateToParent = () => {
    navigate('..');
  };

  const navigateToRoot = () => {
    navigate('/');
  };

  return {
    generateFromPath,
    navigateToParent,
    navigateToRoot
  };
}

// Quick breadcrumb for common routes
export function QuickBreadcrumb({ pathname }: { pathname: string }) {
  const { generateFromPath } = useBreadcrumb();
  const items = generateFromPath(pathname);

  return <EnhancedBreadcrumb items={items} />;
}