
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  GraduationCap, 
  Shield, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Wifi,
  RefreshCw
} from 'lucide-react';
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
        const profilesRes = await (supabase as any)
          .from('user_profiles')
          .select('id, role, last_login_at');
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
          batchUtilization.reduce((sum, b) => sum + b.utilization, 0) / batchUtilization.length || 0
        )
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Enhanced Dashboard</h2>
            <p className="text-gray-600">
              Welcome back, {profile?.full_name || 'User'} ({profile?.role})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                performHealthCheck();
                refetchStats();
              }}
              disabled={isChecking}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant="outline" className={getStatusColor(metrics?.overall || 'unknown')}>
              System: {metrics?.overall || 'Checking...'}
            </Badge>
          </div>
        </div>

        {/* System Health Status */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Database</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(metrics.database)}>
                    {getStatusIcon(metrics.database)}
                    {metrics.database}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Auth</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(metrics.authentication)}>
                    {getStatusIcon(metrics.authentication)}
                    {metrics.authentication}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Network</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(metrics.connectivity)}>
                    {getStatusIcon(metrics.connectivity)}
                    {metrics.connectivity}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Overall</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(metrics.overall)}>
                    {getStatusIcon(metrics.overall)}
                    {metrics.overall}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.studentsToday || 0} today
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
              <GraduationCap className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBatches || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.avgUtilization || 0}% avg utilization
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Users</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active users in system
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.studentsThisWeek || 0}</div>
              <p className="text-xs text-muted-foreground">
                New students added
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Batch Utilization */}
        {stats?.batchUtilization && stats.batchUtilization.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Batch Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.batchUtilization.map((batch, index) => (
                <div key={batch.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Batch {index + 1}</span>
                    <span>{batch.current}/{batch.max} ({batch.utilization}%)</span>
                  </div>
                  <Progress value={batch.utilization} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Security Alert */}
        {metrics?.overall === 'critical' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              Critical system issues detected. Please check system health monitoring for details.
            </AlertDescription>
          </Alert>
        )}

        {/* Role-based Content */}
        {hasRole('super_admin') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin Panel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Administrative functions and system management tools.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  View Audit Logs
                </Button>
                <Button variant="outline" size="sm">
                  Manage Users
                </Button>
                <Button variant="outline" size="sm">
                  System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
