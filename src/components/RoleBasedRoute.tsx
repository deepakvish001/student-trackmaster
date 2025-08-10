/**
 * Role-Based Route Protection Component
 * Provides fine-grained access control based on user roles
 */

import { ReactNode } from 'react';
import { useUserProfile, UserRole } from '@/hooks/useUserProfile';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { logSecurityEvent } from '@/utils/inputSanitization';
import { toast } from 'sonner';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export default function RoleBasedRoute({ 
  children, 
  allowedRoles, 
  fallbackPath = '/dashboard',
  showAccessDenied = true 
}: RoleBasedRouteProps) {
  const { user } = useEnhancedAuth();
  const { profile, isLoading, hasRole } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user && profile) {
      // Check if user has any of the allowed roles
      const hasPermission = allowedRoles.some(role => hasRole(role));
      
      if (!hasPermission) {
        // Log unauthorized access attempt
        logSecurityEvent('ROLE_BASED_ACCESS_DENIED', {
          userId: user.id,
          userRole: profile.role,
          requiredRoles: allowedRoles,
          route: window.location.pathname,
          timestamp: new Date().toISOString()
        });

        if (showAccessDenied) {
          toast.error('Access denied. You do not have permission to view this page.');
        }

        // Redirect to fallback path
        navigate(fallbackPath, { replace: true });
      } else {
        // Log successful authorized access
        logSecurityEvent('ROLE_BASED_ACCESS_GRANTED', {
          userId: user.id,
          userRole: profile.role,
          route: window.location.pathname,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [user, profile, isLoading, allowedRoles, hasRole, navigate, fallbackPath, showAccessDenied]);

  // Show loading while checking permissions
  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check permissions
  const hasPermission = allowedRoles.some(role => hasRole(role));
  
  if (!hasPermission) {
    return null; // Component will handle redirect in useEffect
  }

  return <>{children}</>;
}

// Convenience components for common role combinations
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return (
    <RoleBasedRoute allowedRoles={['super_admin']}>
      {children}
    </RoleBasedRoute>
  );
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <RoleBasedRoute allowedRoles={['super_admin']}>
      {children}
    </RoleBasedRoute>
  );
}

export function UserRoute({ children }: { children: ReactNode }) {
  return (
    <RoleBasedRoute allowedRoles={['user', 'super_admin']}>
      {children}
    </RoleBasedRoute>
  );
}