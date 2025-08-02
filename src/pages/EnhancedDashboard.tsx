
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { DynamicStatsCard } from '@/components/ui/dynamic-stats-card';
import { 
  Users, 
  GraduationCap, 
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function EnhancedDashboard() {
  const { profile } = useUserProfile();

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [studentsRes, batchesRes] = await Promise.all([
        supabase.from('students').select('id, created_at, batch_id').eq('is_enabled', true),
        supabase.from('batches').select('id, created_at, max_students').eq('is_enabled', true)
      ]);

      const students = studentsRes.data || [];
      const batches = batchesRes.data || [];

      // Calculate batch utilization
      const batchUtilization = await Promise.all(
        batches.map(async (batch) => {
          const { count } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('batch_id', batch.id)
            .eq('is_enabled', true);
          
          return {
            id: batch.id,
            current: count || 0,
            max: batch.max_students,
            utilization: Math.round(((count || 0) / batch.max_students) * 100)
          };
        })
      );

      const remainingCapacity = batches.reduce((sum, batch) => {
        const batchData = batchUtilization.find(b => b.id === batch.id);
        return sum + (batch.max_students - (batchData?.current || 0));
      }, 0);

      return {
        totalStudents: students.length,
        totalBatches: batches.length,
        remainingBatches: remainingCapacity
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
            <p className="text-gray-600">
              Welcome back, {profile?.full_name || 'User'}
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DynamicStatsCard
            title="Total Batches"
            value={stats?.totalBatches || 0}
            icon={GraduationCap}
            color="blue"
            animate={true}
          />
          
          <DynamicStatsCard
            title="Total Students"
            value={stats?.totalStudents || 0}
            icon={Users}
            color="green"
            animate={true}
            realTime={true}
          />
          
          <DynamicStatsCard
            title="Remaining Batches"
            value={stats?.remainingBatches || 0}
            icon={Activity}
            color="orange"
            animate={true}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
