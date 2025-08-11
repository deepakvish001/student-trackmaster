import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { PWAFeatureCenter } from '@/components/PWAFeatureCenter';

export default function PWASettings() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <PWAFeatureCenter />
      </div>
    </DashboardLayout>
  );
}