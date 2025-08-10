import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Users, GraduationCap, Shield, Activity, AlertTriangle, CheckCircle, Clock, Database, Wifi, RefreshCw, TrendingUp, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSystemHealthMonitoring } from '@/hooks/useSystemHealthMonitoring';
import { useAuditLog } from '@/hooks/useAuditLog';

export default function EnhancedDashboard() {
  const { profile, hasRole } = useUserProfile();
  const { metrics, isChecking, performHealthCheck } = useSystemHealthMonitoring();
  const { logEvent } = useAuditLog();

  // Enhanced dashboard statistics with real-time batch updates
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Use parallel queries with detailed batch information
      const [studentsRes, batchesRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, created_at, batch_id')
          .eq('is_enabled', true),
        supabase
          .from('batches')
          .select('id, created_at, max_students, batch_name, serial_number, admin_name')
          .eq('is_enabled', true)
      ]);
      
      const students = studentsRes.data || [];
      const batches = batchesRes.data || [];
      console.log('Dashboard batches data:', batches);

      // Get user profiles data with minimal selection and error handling
      let profiles = [];
      try {
        const profilesRes = await supabase
          .from('user_profiles')
          .select('id, role, last_login_at');
        profiles = profilesRes.data || [];
      } catch (err) {
        console.warn('Could not fetch user profiles:', err);
      }

      // Calculate enhanced batch utilization with names
      const batchUtilizationPromises = batches.map(async (batch) => {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact' })
          .eq('batch_id', batch.id)
          .eq('is_enabled', true);
        
        const batchData = {
          id: batch.id,
          name: batch.batch_name || `Batch ${batch.serial_number}`,
          serialNumber: batch.serial_number,
          current: count || 0,
          max: batch.max_students,
          utilization: Math.round(((count || 0) / batch.max_students) * 100)
        };
        console.log('Batch utilization data:', batchData);
        return batchData;
      });

      const batchUtilization = await Promise.all(batchUtilizationPromises);

      // Calculate date filters once
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

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
    staleTime: Infinity, // Never consider data stale
    gcTime: Infinity, // Keep in cache forever
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: false, // Use cached data
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  // Real-time updates for batch data
  React.useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'batches'
        },
        (payload) => {
          console.log('Batch data changed:', payload);
          // Refetch stats when batch data changes
          refetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'students'
        },
        (payload) => {
          console.log('Student data changed:', payload);
          // Refetch stats when student data changes
          refetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchStats]);

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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto space-y-10 p-8">
          {/* Enhanced Premium Header */}
          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/30">
                <LayoutDashboard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent mb-2">
                  BiometricHub Dashboard
                </h1>
                <p className="text-xl text-gray-300 font-medium">
                  Advanced biometric management & analytics platform
                </p>
              </div>
            </div>
            
            {/* Enhanced Stats Summary Bar */}
            <div className="bg-black/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-400">{stats?.totalStudents || 0}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Students</div>
                  </div>
                  <div className="w-px h-12 bg-gray-700"></div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{stats?.totalBatches || 0}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Batches</div>
                  </div>
                  <div className="w-px h-12 bg-gray-700"></div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-400">{stats?.totalUsers || 0}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">Users</div>
                  </div>
                  <div className="w-px h-12 bg-gray-700"></div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">+{stats?.studentsThisWeek || 0}</div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">This Week</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => refetchStats()}
                    variant="outline"
                    size="sm"
                    className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Key Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-black/90 border-gray-700/50 shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 group backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-orange-400" />
                    </div>
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-2">
                      Total Students
                    </h3>
                    <p className="text-4xl font-bold text-white mb-1">
                      {stats?.totalStudents || 0}
                    </p>
                    <p className="text-sm text-gray-400">
                      Active enrollments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/90 border-gray-700/50 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 group backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border border-emerald-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-8 w-8 text-emerald-400" />
                    </div>
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">
                      System Users
                    </h3>
                    <p className="text-4xl font-bold text-white mb-1">
                      {stats?.totalUsers || 0}
                    </p>
                    <p className="text-sm text-gray-400">
                      Admin accounts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/90 border-gray-700/50 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 group backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="h-8 w-8 text-blue-400" />
                    </div>
                    <Activity className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">
                      Active Batches
                    </h3>
                    <p className="text-4xl font-bold text-white mb-1">
                      {stats?.totalBatches || 0}
                    </p>
                    <p className="text-sm text-gray-400">
                      Learning groups
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/90 border-gray-700/50 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 group backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-8 w-8 text-purple-400" />
                    </div>
                    <Clock className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2">
                      This Week
                    </h3>
                    <p className="text-4xl font-bold text-white mb-1">
                      +{stats?.studentsThisWeek || 0}
                    </p>
                    <p className="text-sm text-gray-400">
                      New enrollments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Batch Analytics - Full Width */}
          <div className="grid grid-cols-1 gap-8">
            <Card className="bg-black/90 border-gray-700/50 shadow-2xl backdrop-blur-xl">
              <CardHeader className="pb-6 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-600/30 border border-blue-500/30 rounded-xl flex items-center justify-center">
                      <LayoutDashboard className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">Batch Analytics</CardTitle>
                      <p className="text-gray-400">Real-time utilization tracking & performance metrics</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Average Utilization</div>
                      <div className="text-2xl font-bold text-blue-400">{stats?.avgUtilization || 0}%</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {stats?.batchUtilization && stats.batchUtilization.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.batchUtilization.map((batch, index) => (
                      <div key={batch.id} className="bg-black/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <span className="text-sm font-bold text-blue-400">{index + 1}</span>
                              </div>
                              <div>
                                <h3 className="font-bold text-orange-200 text-xl leading-tight">{batch.name}</h3>
                                <p className="text-sm text-gray-400 mt-1">{batch.serialNumber}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-white">
                                {batch.current}/{batch.max}
                              </div>
                              <p className="text-xs text-gray-400 uppercase tracking-wider">Students</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">Capacity Usage</span>
                              <span className="text-sm font-bold text-blue-400">{batch.utilization}%</span>
                            </div>
                            <div className="relative">
                              <Progress 
                                value={batch.utilization} 
                                className="h-3 bg-gray-700/50" 
                              />
                              <div 
                                className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full"
                                style={{ width: `${batch.utilization}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{batch.utilization < 50 ? 'Low utilization' : batch.utilization < 80 ? 'Moderate usage' : 'High capacity'}</span>
                              <span>{batch.max - batch.current} slots available</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-black/80 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Database className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400 mb-2">No Batch Data Available</h3>
                    <p className="text-gray-500">Create your first batch to see analytics here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}