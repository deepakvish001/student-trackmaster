
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
      const { error } = await supabase.rpc('log_audit_event', {
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
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.table_name) query = query.eq('table_name', filters.table_name);
      if (filters.user_id) query = query.eq('user_id', filters.user_id);
      if (filters.start_date) query = query.gte('created_at', filters.start_date);
      if (filters.end_date) query = query.lte('created_at', filters.end_date);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
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
