import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AuditLogViewer from '@/components/admin/AuditLogViewer';

export default function AuditLogs() {
  return (
    <AdminLayout>
      <div className="space-y-8 p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-electric-blue to-vibrant-purple bg-clip-text text-transparent">Audit Logs</h1>
          <p className="text-lg text-muted-foreground">Monitor all system activities and user actions</p>
        </div>
        <AuditLogViewer />
      </div>
    </AdminLayout>
  );
}