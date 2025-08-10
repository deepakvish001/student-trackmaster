import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AuditLogViewer from '@/components/admin/AuditLogViewer';

export default function AuditLogs() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Audit Logs</h2>
          <p className="text-muted-foreground">Monitor all system activities and user actions</p>
        </div>
        <AuditLogViewer />
      </div>
    </AdminLayout>
  );
}