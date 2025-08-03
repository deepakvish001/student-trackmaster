
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { DynamicStatsCard } from '@/components/ui/dynamic-stats-card';
import { RealTimeClock } from '@/components/ui/real-time-clock';
import { 
  Users, 
  GraduationCap, 
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function EnhancedDashboard() {
  const { profile } = useUserProfile();

  // Fetch dashboard statistics with real-time updates
  const { data: stats, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      console.log('📊 Fetching dashboard statistics...');
      
      const [studentsRes, batchesRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, created_at, batch_id, student_name')
          .eq('is_enabled', true),
        supabase
          .from('batches')
          .select('id, created_at, max_students, batch_name')
          .eq('is_enabled', true)
      ]);

      console.log('Students data:', studentsRes.data);
      console.log('Batches data:', batchesRes.data);

      if (studentsRes.error) {
        console.error('Students fetch error:', studentsRes.error);
        throw studentsRes.error;
      }

      if (batchesRes.error) {
        console.error('Batches fetch error:', batchesRes.error);
        throw batchesRes.error;
      }

      const students = studentsRes.data || [];
      const batches = batchesRes.data || [];

      // Calculate remaining capacity across all batches
      const totalCapacity = batches.reduce((sum, batch) => sum + batch.max_students, 0);
      const totalStudents = students.length;
      const remainingCapacity = totalCapacity - totalStudents;

      const stats = {
        totalStudents,
        totalBatches: batches.length,
        remainingCapacity: Math.max(0, remainingCapacity)
      };

      console.log('📈 Dashboard stats calculated:', stats);
      return stats;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Set up real-time subscriptions
  React.useEffect(() => {
    console.log('🔄 Setting up real-time subscriptions...');
    
    const studentsChannel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          console.log('📝 Students table change:', payload);
          refetch();
        }
      )
      .subscribe();

    const batchesChannel = supabase
      .channel('batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches'
        },
        (payload) => {
          console.log('📦 Batches table change:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time subscriptions...');
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(batchesChannel);
    };
  }, [refetch]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Real-time Clock */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
            <p className="text-gray-600">
              Welcome back, {profile?.full_name || 'User'}
            </p>
          </div>
          <RealTimeClock showDate={true} showSeconds={true} />
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
            title="Available Capacity"
            value={stats?.remainingCapacity || 0}
            icon={Activity}
            color="orange"
            animate={true}
          />
        </div>

        {/* Debug Information (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-600">
              {JSON.stringify(stats, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
