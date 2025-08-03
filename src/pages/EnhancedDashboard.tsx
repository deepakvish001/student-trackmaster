
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  // Fetch dashboard statistics with real-time updates
  const { data: stats, isLoading, error } = useQuery({
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
    refetchInterval: 3000, // Refresh every 3 seconds for better real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
  });

  // Set up real-time subscriptions with proper cleanup and error handling
  React.useEffect(() => {
    console.log('🔄 Setting up real-time subscriptions...');
    
    const studentsChannel = supabase
      .channel('students-realtime-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          console.log('📝 Students table change detected:', payload.eventType, payload.new, payload.old);
          
          // Invalidate and refetch the dashboard stats
          queryClient.invalidateQueries({ 
            queryKey: ['dashboard-stats'],
            exact: true 
          });
        }
      )
      .subscribe((status) => {
        console.log('Students channel status:', status);
      });

    const batchesChannel = supabase
      .channel('batches-realtime-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches'
        },
        (payload) => {
          console.log('📦 Batches table change detected:', payload.eventType, payload.new, payload.old);
          
          // Invalidate and refetch the dashboard stats
          queryClient.invalidateQueries({ 
            queryKey: ['dashboard-stats'],
            exact: true 
          });
        }
      )
      .subscribe((status) => {
        console.log('Batches channel status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up real-time subscriptions...');
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(batchesChannel);
    };
  }, [queryClient]);

  // Handle loading and error states
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
              <p className="text-gray-600">Loading data...</p>
            </div>
            <RealTimeClock showDate={true} showSeconds={true} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    console.error('Dashboard error:', error);
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary">Dashboard</h2>
              <p className="text-red-600">Error loading data. Please refresh the page.</p>
            </div>
            <RealTimeClock showDate={true} showSeconds={true} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

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

        {/* Statistics Cards with real-time data */}
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
            realTime={false}
          />
          
          <DynamicStatsCard
            title="Available Capacity"
            value={stats?.remainingCapacity || 0}
            icon={Activity}
            color="orange"
            animate={true}
          />
        </div>

        {/* Real-time status indicator */}
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Real-time updates active</span>
          <span>•</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
