import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Navigate } from 'react-router-dom';

export default function AuditLogs() {
  const { profile, isLoading, isSuperAdmin } = useUserProfile();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !isSuperAdmin()) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Audit Logs</h2>
          <p className="text-muted-foreground">Monitor all system activities and user actions</p>
        </div>
        <AuditLogViewer />
      </div>
    </DashboardLayout>
  );
}