
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_name?: string;
}

interface AuditLogWithProfile extends AuditLogEntry {
  user_profile?: {
    full_name: string;
  };
}

export function useAuditLog() {
  const [isLoading, setIsLoading] = useState(false);

  const logEvent = async (
    action: string,
    description?: string,
    tableName?: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for better logging
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Create enhanced action description
      const userName = profile?.full_name || 'Unknown User';
      const enhancedAction = description || formatActionDescription(action, userName, tableName, recordId);

      // Direct insert into audit_logs table
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: enhancedAction,
          table_name: tableName,
          record_id: recordId,
          old_values: oldValues,
          new_values: newValues,
          ip_address: null, // Could be enhanced to get real IP
          user_agent: navigator?.userAgent || null
        });

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  };

  const formatActionDescription = (action: string, userName: string, tableName?: string, recordId?: string): string => {
    const table = tableName || 'item';
    const id = recordId ? ` #${recordId.substring(0, 8)}` : '';
    
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return `${userName} created a new ${table}${id}`;
      case 'update':
      case 'modify':
        return `${userName} updated ${table}${id}`;
      case 'delete':
      case 'remove':
        return `${userName} deleted ${table}${id}`;
      case 'login':
        return `${userName} logged in`;
      case 'logout':
        return `${userName} logged out`;
      case 'signup':
        return `${userName} signed up`;
      default:
        return `${userName} performed ${action} on ${table}${id}`;
    }
  };

  const getAuditLogs = async (
    filters: {
      limit?: number;
      offset?: number;
      action?: string;
      table_name?: string;
      user_id?: string;
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<AuditLogWithProfile[]> => {
    try {
      setIsLoading(true);
      
      // Fetch audit logs with user profile data
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user_profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(log => ({
        ...log,
        user_profile: Array.isArray(log.user_profiles) ? log.user_profiles[0] : log.user_profiles
      }));
      
      return transformedData as AuditLogWithProfile[];
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    logEvent,
    getAuditLogs,
    isLoading
  };
}
