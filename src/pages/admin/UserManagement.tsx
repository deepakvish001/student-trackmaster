import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import UserManagement from '@/components/admin/UserManagement';

export default function UserManagementPage() {
  return (
    <AdminLayout>
      <div className="space-y-8 p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-electric-blue to-vibrant-purple bg-clip-text text-transparent">User Management</h1>
          <p className="text-lg text-muted-foreground">Manage system users and permissions</p>
        </div>
        <UserManagement />
      </div>
    </AdminLayout>
  );
}