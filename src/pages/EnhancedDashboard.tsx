import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Users, GraduationCap, Shield, Activity, AlertTriangle, CheckCircle, Clock, Database, Wifi, RefreshCw, TrendingUp } from 'lucide-react';
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">System overview and health monitoring</p>
          </div>

          {/* System Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['database', 'auth', 'network', 'overall'] as const).map((service) => {
              const status = metrics?.[service as keyof typeof metrics] || 'unknown';
              return (
                <Card key={service} className="modern-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {service}
                        </p>
                        <p className={`text-sm font-semibold ${getStatusColor(status)}`}>
                          {status}
                        </p>
                      </div>
                      <div className={`p-2 rounded ${getStatusColor(status).replace('text-', 'bg-').replace('foreground', 'primary/10')}`}>
                        {getStatusIcon(status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Key Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Students</p>
                    <p className="text-lg font-semibold text-foreground">
                      {stats?.totalStudents || 0}
                    </p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Batches</p>
                    <p className="text-lg font-semibold text-foreground">
                      {stats?.totalBatches || 0}
                    </p>
                  </div>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Users</p>
                    <p className="text-lg font-semibold text-foreground">
                      {stats?.totalUsers || 0}
                    </p>
                  </div>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="modern-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Week</p>
                    <p className="text-lg font-semibold text-foreground">
                      +{stats?.studentsThisWeek || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Utilization */}
          <Card className="modern-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Batch Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.batchUtilization && stats.batchUtilization.length > 0 ? (
                stats.batchUtilization.map((batch) => (
                  <div key={batch.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground">Batch {batch.id}</span>
                      <span className="text-xs text-muted-foreground">
                        {batch.current}/{batch.max}
                      </span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${batch.utilization}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No batch data available</p>
              )}
            </CardContent>
          </Card>

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
      </div>
    </DashboardLayout>
  );
}