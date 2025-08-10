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
  const { getAuditLogs } = useAuditLog();

  // Optimized dashboard statistics with efficient queries
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Use parallel queries with minimal data selection for speed
      const [studentsRes, batchesRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, created_at, batch_id')
          .eq('is_enabled', true),
        supabase
          .from('batches')
          .select('id, created_at, max_students')
          .eq('is_enabled', true)
      ]);
      
      const students = studentsRes.data || [];
      const batches = batchesRes.data || [];

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

      // Calculate batch utilization efficiently with single query per batch
      const batchUtilizationPromises = batches.map(async (batch) => {
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false // Prevent unnecessary refetches
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
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Premium Header */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 branded-gradient rounded-2xl flex items-center justify-center shadow-glow-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-branded-gradient">
                  Welcome to BiometricHub
                </h1>
                <p className="text-lg text-muted-foreground">
                  Enterprise-grade biometric management at your fingertips
                </p>
              </div>
            </div>
          </div>

          {/* Premium System Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(['database', 'auth', 'network', 'overall'] as const).map((service, index) => {
              const status = metrics?.[service as keyof typeof metrics] || 'unknown';
              const colors = ['electric-blue', 'vibrant-purple', 'emerald-green', 'sunset-orange'];
              const colorClass = colors[index];
              return (
                <Card key={service} className="premium-card group">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 bg-${colorClass}/10 border border-${colorClass}/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          {getStatusIcon(status)}
                        </div>
                        <Badge className={`${getStatusColor(status).replace('text-', 'bg-').replace('foreground', 'primary/10')} border-0 px-3 py-1`}>
                          {status}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground capitalize">
                          {service} Service
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {status === 'healthy' ? 'All systems operational' : 
                           status === 'degraded' ? 'Performance reduced' : 
                           'Requires attention'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Premium Key Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-electric-blue/10 border border-electric-blue/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-7 w-7 text-electric-blue" />
                    </div>
                    <TrendingUp className="h-5 w-5 text-emerald-green" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-electric-blue uppercase tracking-wider">
                      Total Students
                    </h3>
                    <p className="text-3xl font-bold text-foreground">
                      {stats?.totalStudents || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Active enrollments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-vibrant-purple/10 border border-vibrant-purple/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="h-7 w-7 text-vibrant-purple" />
                    </div>
                    <Activity className="h-5 w-5 text-emerald-green" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-vibrant-purple uppercase tracking-wider">
                      Active Batches
                    </h3>
                    <p className="text-3xl font-bold text-foreground">
                      {stats?.totalBatches || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Learning groups
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-emerald-green/10 border border-emerald-green/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-7 w-7 text-emerald-green" />
                    </div>
                    <CheckCircle className="h-5 w-5 text-emerald-green" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-green uppercase tracking-wider">
                      System Users
                    </h3>
                    <p className="text-3xl font-bold text-foreground">
                      {stats?.totalUsers || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Admin accounts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card group interactive-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-sunset-orange/10 border border-sunset-orange/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-7 w-7 text-sunset-orange" />
                    </div>
                    <Clock className="h-5 w-5 text-emerald-green" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-sunset-orange uppercase tracking-wider">
                      This Week
                    </h3>
                    <p className="text-3xl font-bold text-foreground">
                      +{stats?.studentsThisWeek || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      New enrollments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Premium Batch Utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="premium-card">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-vibrant-purple/10 border border-vibrant-purple/20 rounded-xl flex items-center justify-center">
                    <LayoutDashboard className="h-5 w-5 text-vibrant-purple" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Batch Analytics</CardTitle>
                    <p className="text-sm text-muted-foreground">Real-time utilization tracking</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.batchUtilization && stats.batchUtilization.length > 0 ? (
                  stats.batchUtilization.map((batch, index) => (
                    <div key={batch.id} className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-electric-blue/10 border border-electric-blue/20 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-electric-blue">{index + 1}</span>
                          </div>
                          <span className="font-semibold text-foreground">Batch {batch.id}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-foreground">
                            {batch.current}/{batch.max}
                          </span>
                          <p className="text-xs text-muted-foreground">capacity</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Progress value={batch.utilization} className="h-3" />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Utilization</span>
                          <span className="text-sm font-bold text-vibrant-purple">{batch.utilization}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Database className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No batch data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="premium-card">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-green/10 border border-emerald-green/20 rounded-xl flex items-center justify-center">
                    <Activity className="h-5 w-5 text-emerald-green" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Quick Actions</CardTitle>
                    <p className="text-sm text-muted-foreground">Streamlined workflows</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full h-14 bg-sunset-orange hover:bg-sunset-orange/90 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl" onClick={() => window.location.href = '/students/enhanced-add'}>
                  <Users className="h-5 w-5 mr-3" />
                  Add New Student
                </Button>
                <Button className="w-full h-14 bg-electric-blue hover:bg-electric-blue/90 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl" onClick={() => window.location.href = '/batches'}>
                  <GraduationCap className="h-5 w-5 mr-3" />
                  Manage Batches
                </Button>
                <Button className="w-full h-14 bg-emerald-green hover:bg-emerald-green/90 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl" onClick={() => window.location.href = '/students'}>
                  <Shield className="h-5 w-5 mr-3" />
                  View All Students
                </Button>
              </CardContent>
            </Card>
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
      </div>
    </DashboardLayout>
  );
}