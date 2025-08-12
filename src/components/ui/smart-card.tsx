import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SmartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'interactive' | 'expandable' | 'feature';
  children: React.ReactNode;
  className?: string;
  expandable?: boolean;
  defaultExpanded?: boolean;
  actions?: Array<{
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
  onCardClick?: () => void;
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
  };
  stats?: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}

const cardVariants = {
  default: 'border border-border bg-card hover:shadow-enhanced transition-all duration-300',
  interactive: 'border border-border bg-card hover:shadow-glow hover:scale-[1.02] cursor-pointer transition-all duration-300 interactive-card',
  expandable: 'border border-border bg-card shadow-enhanced',
  feature: 'premium-card hover:shadow-glow-lg'
};

const badgeVariants = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-green/20 text-emerald-green border border-emerald-green/30',
  warning: 'bg-sunset-orange/20 text-sunset-orange border border-sunset-orange/30',
  error: 'bg-destructive/20 text-destructive border border-destructive/30'
};

export function SmartCard({
  title,
  subtitle,
  icon: Icon,
  variant = 'default',
  children,
  className,
  expandable = false,
  defaultExpanded = false,
  actions,
  onCardClick,
  badge,
  stats
}: SmartCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleCardClick = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
    onCardClick?.();
  };

  return (
    <Card 
      className={cn(
        cardVariants[variant],
        expandable && 'cursor-pointer',
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-card-foreground truncate">
                  {title}
                </h3>
                {badge && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    badgeVariants[badge.variant || 'default']
                  )}>
                    {badge.text}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
              
              {stats && (
                <div className="flex items-center space-x-4 mt-2">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-sm">
                      <span className="text-muted-foreground">{stat.label}: </span>
                      <span className={cn(
                        'font-medium',
                        stat.trend === 'up' && 'text-emerald-green',
                        stat.trend === 'down' && 'text-destructive',
                        stat.trend === 'neutral' && 'text-card-foreground'
                      )}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {expandable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {actions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                      className={cn(
                        action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                      )}
                    >
                      {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      {(!expandable || isExpanded) && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}