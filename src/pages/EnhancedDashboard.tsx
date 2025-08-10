import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Users, GraduationCap, Shield, Activity, AlertTriangle, CheckCircle, Clock, Database, Wifi, RefreshCw, TrendingUp, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSystemHealthMonitoring } from '@/hooks/useSystemHealthMonitoring';
import { useAuditLog } from '@/hooks/useAuditLog';

export default function EnhancedDashboard() {
  const { profile, hasRole } = useUserProfile();
  const { metrics, isChecking, performHealthCheck } = useSystemHealthMonitoring();
  const { getAuditLogs } = useAuditLog();

  // Fetch dashboard statistics
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [studentsRes, batchesRes] = await Promise.all([
        supabase.from('students').select('id, created_at, batch_id').eq('is_enabled', true),
        supabase.from('batches').select('id, created_at, max_students').eq('is_enabled', true)
      ]);
      
      const students = studentsRes.data || [];
      const batches = batchesRes.data || [];

      // Get user profiles data with error handling
      let profiles = [];
      try {
        const profilesRes = await (supabase as any).from('user_profiles').select('id, role, last_login_at');
        profiles = profilesRes.data || [];
      } catch (err) {
        console.warn('Could not fetch user profiles:', err);
      }

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

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const startOfWeek = new Date(today.setDate(today.getDate() - 7)).toISOString();

      return {
        totalStudents: students.length,
        totalBatches: batches.length,
        totalUsers: profiles.length,
        studentsToday: students.filter(s => s.created_at >= startOfDay).length,
        studentsThisWeek: students.filter(s => s.created_at >= startOfWeek).length,
        batchUtilization,
        avgUtilization: Math.round(
          batchUtilization.reduce((sum, b) => sum + b.utilization, 0) / (batchUtilization.length || 1)
        )
      };
    },
    refetchInterval: 30000
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Calculate remaining batches for AdminLTE style
  const remainingBatches = stats?.batchUtilization ? 
    stats.batchUtilization.reduce((total, batch) => total + (batch.max - batch.current), 0) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* AdminLTE Style Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Batches - Cyan */}
          <div className="bg-cyan-500 rounded-md p-6 text-white relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{stats?.totalBatches || 0}</div>
                <div className="text-cyan-100 text-lg font-medium">Total Batches</div>
              </div>
              <div className="opacity-30">
                <GraduationCap size={80} />
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-cyan-400">
              <div className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 transition-colors rounded px-4 py-2 cursor-pointer">
                <span className="text-sm">More info</span>
                <ChevronRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </div>

          {/* Total Students - Green */}
          <div className="bg-green-500 rounded-md p-6 text-white relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{stats?.totalStudents || 0}</div>
                <div className="text-green-100 text-lg font-medium">Total Students</div>
              </div>
              <div className="opacity-30">
                <Users size={80} />
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-green-400">
              <div className="flex items-center justify-center bg-green-600 hover:bg-green-700 transition-colors rounded px-4 py-2 cursor-pointer">
                <span className="text-sm">More info</span>
                <ChevronRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </div>

          {/* Remaining Batches - Yellow */}
          <div className="bg-yellow-500 rounded-md p-6 text-white relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">-{remainingBatches}</div>
                <div className="text-yellow-100 text-lg font-medium">Remaining Batches</div>
              </div>
              <div className="opacity-30">
                <Activity size={80} />
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-yellow-400">
              <div className="flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 transition-colors rounded px-4 py-2 cursor-pointer">
                <span className="text-sm">More info</span>
                <ChevronRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Security Alert */}
        {metrics?.overall === 'critical' && (
          <Alert className="border-destructive/20 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Critical system issues detected. Please check system health monitoring for details.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}