
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
      const { error } = await supabase.rpc('log_audit_event' as any, {
        p_action: action,
        p_table_name: tableName,
        p_record_id: recordId,
        p_old_values: oldValues,
        p_new_values: newValues
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
      
      // Use raw SQL query for audit_logs table
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
