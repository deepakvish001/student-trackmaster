import { supabase } from '@/integrations/supabase/client';

interface AuditLogParams {
  action: string;
  description?: string;
  tableName?: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
}

class AuditLogService {
  private static instance: AuditLogService;

  static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  async log({ action, description, tableName, recordId, oldValues, newValues }: AuditLogParams) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for better logging
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const userName = profile?.full_name || 'Unknown User';
      const finalDescription = description || this.formatActionDescription(action, userName, tableName, recordId);

      // Insert audit log
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: finalDescription,
          table_name: tableName,
          record_id: recordId,
          old_values: oldValues,
          new_values: newValues,
          user_agent: navigator?.userAgent || null
        });

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  }

  private formatActionDescription(action: string, userName: string, tableName?: string, recordId?: string): string {
    const table = tableName || 'item';
    const id = recordId ? ` #${recordId.substring(0, 8)}` : '';
    
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
      case 'student_created':
        return `${userName} created a new ${table}${id}`;
      case 'update':
      case 'modify':
      case 'student_updated':
        return `${userName} updated ${table}${id}`;
      case 'delete':
      case 'remove':
      case 'student_deleted':
        return `${userName} deleted ${table}${id}`;
      case 'batch_created':
        return `${userName} created a new batch${id}`;
      case 'batch_updated':
        return `${userName} updated batch${id}`;
      case 'batch_deleted':
        return `${userName} deleted batch${id}`;
      case 'login':
        return `${userName} logged in`;
      case 'logout':
        return `${userName} logged out`;
      case 'signup':
        return `${userName} signed up`;
      case 'fingerprint_captured':
        return `${userName} captured fingerprint data`;
      case 'fingerprint_deleted':
        return `${userName} removed fingerprint data`;
      case 'user_created':
        return `${userName} created a new user account`;
      case 'user_updated':
        return `${userName} updated user account${id}`;
      case 'user_deleted':
        return `${userName} deleted user account${id}`;
      case 'user_enabled':
        return `${userName} enabled user account${id}`;
      case 'user_disabled':
        return `${userName} disabled user account${id}`;
      case 'password_changed':
        return `${userName} changed a user's password`;
      case 'role_changed':
        return `${userName} changed a user's role`;
      case 'batch_access_granted':
        return `${userName} granted batch access`;
      case 'batch_access_removed':
        return `${userName} removed batch access`;
      case 'system_settings_updated':
        return `${userName} updated system settings`;
      case 'export_data':
        return `${userName} exported data`;
      case 'import_data':
        return `${userName} imported data`;
      case 'view_audit_logs':
        return `${userName} viewed audit logs`;
      case 'search_performed':
        return `${userName} performed a search`;
      default:
        return `${userName} performed ${action} on ${table}${id}`;
    }
  }

  // Convenience methods for common actions
  async logStudentAction(action: 'created' | 'updated' | 'deleted', studentId: string, studentName?: string, additionalData?: any) {
    await this.log({
      action: `student_${action}`,
      tableName: 'students',
      recordId: studentId,
      description: studentName ? `Student "${studentName}" was ${action}` : undefined,
      newValues: additionalData
    });
  }

  async logBatchAction(action: 'created' | 'updated' | 'deleted', batchId: string, batchName?: string, additionalData?: any) {
    await this.log({
      action: `batch_${action}`,
      tableName: 'batches',
      recordId: batchId,
      description: batchName ? `Batch "${batchName}" was ${action}` : undefined,
      newValues: additionalData
    });
  }

  async logUserAction(action: 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled', userId: string, userName?: string, additionalData?: any) {
    await this.log({
      action: `user_${action}`,
      tableName: 'user_profiles',
      recordId: userId,
      description: userName ? `User "${userName}" was ${action}` : undefined,
      newValues: additionalData
    });
  }

  async logFingerprintAction(action: 'captured' | 'deleted', studentId: string, fingerIndex?: number, additionalData?: any) {
    await this.log({
      action: `fingerprint_${action}`,
      tableName: 'student_fingerprints',
      recordId: studentId,
      description: fingerIndex !== undefined ? `Fingerprint ${fingerIndex + 1} was ${action}` : undefined,
      newValues: additionalData
    });
  }

  async logAuthAction(action: 'login' | 'logout' | 'signup', additionalData?: any) {
    await this.log({
      action,
      tableName: 'auth',
      newValues: additionalData
    });
  }

  async logSystemAction(action: string, description?: string, additionalData?: any) {
    await this.log({
      action,
      description,
      tableName: 'system',
      newValues: additionalData
    });
  }

  async logSearch(searchTerm: string, table: string, resultsCount?: number) {
    await this.log({
      action: 'search_performed',
      description: `Searched for "${searchTerm}" in ${table}`,
      tableName: table,
      newValues: { searchTerm, resultsCount }
    });
  }

  async logExport(dataType: string, recordCount?: number) {
    await this.log({
      action: 'export_data',
      description: `Exported ${recordCount || 'unknown'} ${dataType} records`,
      tableName: dataType,
      newValues: { dataType, recordCount }
    });
  }

  async logImport(dataType: string, recordCount?: number) {
    await this.log({
      action: 'import_data',
      description: `Imported ${recordCount || 'unknown'} ${dataType} records`,
      tableName: dataType,
      newValues: { dataType, recordCount }
    });
  }
}

export const auditLogger = AuditLogService.getInstance();