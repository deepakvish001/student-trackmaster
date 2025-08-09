import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import UserManagement from '@/components/admin/UserManagement';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

export default function UserManagementPage() {
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
        <UserManagement />
      </div>
    </DashboardLayout>
  );
}