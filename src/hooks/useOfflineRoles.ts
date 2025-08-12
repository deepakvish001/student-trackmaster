/**
 * Offline Role Management Hook
 * Provides role validation and batch access that works offline
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import { UserRole } from './useUserProfile';

interface OfflineRoleData {
  userId: string;
  role: UserRole;
  isActive: boolean;
  batchAccess: string[];
  permissions: string[];
  cachedAt: string;
  lastSyncedAt: string;
}

interface RoleConflict {
  id: string;
  type: 'role_change' | 'batch_access' | 'status_change';
  localValue: any;
  remoteValue: any;
  timestamp: string;
  resolved: boolean;
}

export function useOfflineRoles() {
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const [offlineRoles, setOfflineRoles] = useState<OfflineRoleData | null>(null);
  const [roleConflicts, setRoleConflicts] = useState<RoleConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cache user roles and permissions for offline use
  const cacheUserRoles = useCallback(async (userId: string) => {
    if (!isOnline) return;

    try {
      // Fetch user profile and batch access
      const [profileResponse, batchAccessResponse] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('role, is_active')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_batch_access')
          .select('batch_id')
          .eq('user_id', userId)
      ]);

      if (profileResponse.error) {
        console.error('Failed to fetch user profile:', profileResponse.error);
        return;
      }

      const batchIds = batchAccessResponse.data?.map(access => access.batch_id) || [];
      
      // Define permissions based on role
      const permissions = getPermissionsForRole(profileResponse.data.role);
      
      const roleData: OfflineRoleData = {
        userId,
        role: profileResponse.data.role,
        isActive: profileResponse.data.is_active,
        batchAccess: batchIds,
        permissions,
        cachedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString()
      };

      // Store in IndexedDB
      await offlineDb.setMetadata(`user_roles_${userId}`, roleData);
      setOfflineRoles(roleData);
      
      console.log('✅ User roles cached for offline use');
    } catch (error) {
      console.error('Failed to cache user roles:', error);
    }
  }, [isOnline]);

  // Load cached roles for offline use
  const loadCachedRoles = useCallback(async (userId: string) => {
    try {
      const cachedRoles = await offlineDb.getMetadata(`user_roles_${userId}`);
      if (cachedRoles) {
        setOfflineRoles(cachedRoles);
        
        // Check if cache is stale (older than 24 hours)
        const cachedAt = new Date(cachedRoles.cachedAt);
        const hoursOld = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursOld > 24) {
          console.log('⚠️ Role cache is stale, will refresh when online');
        }
      }
    } catch (error) {
      console.error('Failed to load cached roles:', error);
    }
  }, []);

  // Check if user has specific role (works offline)
  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!offlineRoles) return false;
    
    const roleHierarchy = { super_admin: 2, user: 1 };
    return roleHierarchy[offlineRoles.role] >= roleHierarchy[requiredRole];
  }, [offlineRoles]);

  // Check if user has access to specific batch (works offline)
  const hasBatchAccess = useCallback((batchId: string): boolean => {
    if (!offlineRoles) return false;
    
    // Super admin has access to all batches
    if (offlineRoles.role === 'super_admin') return true;
    
    return offlineRoles.batchAccess.includes(batchId);
  }, [offlineRoles]);

  // Check if user has specific permission (works offline)
  const hasPermission = useCallback((permission: string): boolean => {
    if (!offlineRoles) return false;
    return offlineRoles.permissions.includes(permission);
  }, [offlineRoles]);

  // Get permissions for a role
  const getPermissionsForRole = useCallback((role: UserRole): string[] => {
    switch (role) {
      case 'super_admin':
        return [
          'read_all_data',
          'write_all_data',
          'manage_users',
          'manage_batches',
          'manage_system',
          'access_audit_logs',
          'manage_security',
          'biometric_access'
        ];
      case 'user':
        return [
          'read_assigned_data',
          'write_assigned_data',
          'biometric_access'
        ];
      default:
        return [];
    }
  }, []);

  // Detect role conflicts when syncing
  const detectRoleConflicts = useCallback(async (userId: string) => {
    if (!isOnline || !offlineRoles) return;

    try {
      // Fetch current remote data
      const [profileResponse, batchAccessResponse] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('role, is_active')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_batch_access')
          .select('batch_id')
          .eq('user_id', userId)
      ]);

      if (profileResponse.error) return;

      const remoteRole = profileResponse.data.role;
      const remoteIsActive = profileResponse.data.is_active;
      const remoteBatchAccess = batchAccessResponse.data?.map(access => access.batch_id) || [];

      const conflicts: RoleConflict[] = [];

      // Check for role conflicts
      if (offlineRoles.role !== remoteRole) {
        conflicts.push({
          id: crypto.randomUUID(),
          type: 'role_change',
          localValue: offlineRoles.role,
          remoteValue: remoteRole,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }

      // Check for status conflicts
      if (offlineRoles.isActive !== remoteIsActive) {
        conflicts.push({
          id: crypto.randomUUID(),
          type: 'status_change',
          localValue: offlineRoles.isActive,
          remoteValue: remoteIsActive,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }

      // Check for batch access conflicts
      const localBatchSet = new Set(offlineRoles.batchAccess);
      const remoteBatchSet = new Set(remoteBatchAccess);
      
      if (localBatchSet.size !== remoteBatchSet.size || 
          ![...localBatchSet].every(id => remoteBatchSet.has(id))) {
        conflicts.push({
          id: crypto.randomUUID(),
          type: 'batch_access',
          localValue: offlineRoles.batchAccess,
          remoteValue: remoteBatchAccess,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }

      if (conflicts.length > 0) {
        setRoleConflicts(prev => [...prev, ...conflicts]);
        await offlineDb.setMetadata(`role_conflicts_${userId}`, conflicts);
        console.log(`⚠️ Detected ${conflicts.length} role conflicts`);
      }

    } catch (error) {
      console.error('Failed to detect role conflicts:', error);
    }
  }, [isOnline, offlineRoles]);

  // Resolve role conflicts (prefer remote values for security)
  const resolveRoleConflicts = useCallback(async (userId: string, resolutionStrategy: 'prefer_remote' | 'prefer_local' = 'prefer_remote') => {
    try {
      const unresolvedConflicts = roleConflicts.filter(c => !c.resolved);
      
      for (const conflict of unresolvedConflicts) {
        let resolvedValue: any;
        
        if (resolutionStrategy === 'prefer_remote') {
          resolvedValue = conflict.remoteValue;
        } else {
          resolvedValue = conflict.localValue;
        }

        // Apply the resolved value to local cache
        if (offlineRoles) {
          const updatedRoles = { ...offlineRoles };
          
          switch (conflict.type) {
            case 'role_change':
              updatedRoles.role = resolvedValue;
              updatedRoles.permissions = getPermissionsForRole(resolvedValue);
              break;
            case 'status_change':
              updatedRoles.isActive = resolvedValue;
              break;
            case 'batch_access':
              updatedRoles.batchAccess = resolvedValue;
              break;
          }
          
          updatedRoles.lastSyncedAt = new Date().toISOString();
          await offlineDb.setMetadata(`user_roles_${userId}`, updatedRoles);
          setOfflineRoles(updatedRoles);
        }

        // Mark conflict as resolved
        conflict.resolved = true;
      }

      setRoleConflicts(prev => prev.map(c => 
        unresolvedConflicts.find(uc => uc.id === c.id) 
          ? { ...c, resolved: true }
          : c
      ));

      console.log(`✅ Resolved ${unresolvedConflicts.length} role conflicts`);
    } catch (error) {
      console.error('Failed to resolve role conflicts:', error);
    }
  }, [roleConflicts, offlineRoles, getPermissionsForRole]);

  // Sync roles when coming online
  const syncRoles = useCallback(async (userId: string) => {
    if (!isOnline) return;

    try {
      // Detect conflicts first
      await detectRoleConflicts(userId);
      
      // If no conflicts, refresh cache
      if (roleConflicts.length === 0) {
        await cacheUserRoles(userId);
      } else {
        // Auto-resolve conflicts (prefer remote for security)
        await resolveRoleConflicts(userId, 'prefer_remote');
        await cacheUserRoles(userId);
      }
    } catch (error) {
      console.error('Failed to sync roles:', error);
    }
  }, [isOnline, roleConflicts.length, detectRoleConflicts, cacheUserRoles, resolveRoleConflicts]);

  // Initialize roles on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      
      const initializeRoles = async () => {
        await loadCachedRoles(user.id);
        
        if (isOnline) {
          await syncRoles(user.id);
        }
        
        setIsLoading(false);
      };
      
      initializeRoles();
    }
  }, [user?.id, isOnline, loadCachedRoles, syncRoles]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && user?.id && offlineRoles) {
      syncRoles(user.id);
    }
  }, [isOnline, user?.id, offlineRoles, syncRoles]);

  return {
    offlineRoles,
    roleConflicts: roleConflicts.filter(c => !c.resolved),
    isLoading,
    hasRole,
    hasBatchAccess,
    hasPermission,
    syncRoles: user?.id ? () => syncRoles(user.id) : async () => {},
    resolveConflicts: user?.id ? (strategy?: 'prefer_remote' | 'prefer_local') => resolveRoleConflicts(user.id, strategy) : async () => {},
    isSuperAdmin: () => hasRole('super_admin'),
    isActive: offlineRoles?.isActive ?? false
  };
}