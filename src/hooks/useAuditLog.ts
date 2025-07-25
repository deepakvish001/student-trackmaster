
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
}

export function useAuditLog() {
  const [isLoading, setIsLoading] = useState(false);

  const logEvent = async (
    action: string,
    tableName?: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Direct insert into audit_logs table instead of RPC
      const { error } = await (supabase as any)
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action,
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
  ): Promise<AuditLogEntry[]> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }
      
      return (data || []) as AuditLogEntry[];
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
