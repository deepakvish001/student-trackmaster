import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import UserManagement from '@/components/admin/UserManagement';

export default function UserManagementPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <UserManagement />
      </div>
    </AdminLayout>
  );
}