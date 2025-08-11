import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { QuickStatus } from '@/components/QuickStatus';
import { Users, GraduationCap, Shield, Activity, AlertTriangle, CheckCircle, Clock, Database, Wifi, RefreshCw, TrendingUp, LayoutDashboard, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSystemHealthMonitoring } from '@/hooks/useSystemHealthMonitoring';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useInstantStudentUpdates } from '@/hooks/useInstantStudentUpdates';
import { useUltraFastDashboard } from '@/hooks/useUltraFastDashboard';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { CollaborationIndicator } from '@/components/CollaborationIndicator';
import { AdvancedSyncStatus } from '@/components/AdvancedSyncStatus';
import { PWAManagementPanel } from '@/components/PWAManagementPanel';
import { SecurityDashboard } from '@/components/SecurityDashboard';
import { PWAControlCenter } from '@/components/PWAControlCenter';
import { RealTimeSystemMonitor } from '@/components/monitoring/RealTimeSystemMonitor';
import { BiometricAnalyticsDashboard } from '@/components/analytics/BiometricAnalyticsDashboard';
import { RealtimeCollaborationDashboard } from '@/components/collaboration/RealtimeCollaborationDashboard';
import { RealTimePWADashboard } from '@/components/RealTimePWADashboard';
import { PWAFeatureCenter } from '@/components/PWAFeatureCenter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConflictResolutionDialog } from '@/components/ConflictResolutionDialog';
import { SyncButton } from '@/components/SyncButton';
import { useRealTimePWA } from '@/hooks/useRealTimePWA';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
export default function EnhancedDashboard() {
  const { profile: userProfile } = useUserProfile();
  const { isConnected, performanceStats } = useRealTimePWA();
  
  const {
    hasRole
  } = useUserProfile();
  const {
    metrics,
    isChecking,
    performHealthCheck
  } = useSystemHealthMonitoring();
  const {
    logEvent
  } = useAuditLog();

  // Offline capabilities
  const { isOnline } = useOnlineStatus();
  const { pendingCount, lastSyncTime } = useOfflineSync();

  // Enable instant real-time updates (same as View Students page)
  const { forceRefresh } = useInstantStudentUpdates();

  // Use ultra-fast dashboard hook with real-time updates
  const {
    stats,
    recentActivity,
    systemHealth,
    isLoading,
    refetch,
    invalidateAll
  } = useUltraFastDashboard();
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
  return <DashboardLayout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto space-y-10 p-8">
          {/* Enhanced Premium Header */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
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

              {/* Connection Status */}
              <div className="flex items-center gap-4">
                <QuickStatus compact={true} showSync={true} />
              </div>
            </div>
            
              {/* Enhanced Stats Summary Bar with Real-time Indicator */}
              <div className={`bg-black/80 backdrop-blur-xl border rounded-2xl p-6 shadow-2xl ${!isOnline ? 'border-amber-500/30' : 'border-gray-700/50'}`}>
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
                       <div className="text-3xl font-bold text-purple-400">{stats?.completionRate || 0}%</div>
                       <div className="text-sm text-gray-400 uppercase tracking-wider">Complete</div>
                     </div>

                    {/* Offline Status Indicator */}
                    {!isOnline && (
                      <>
                        <div className="w-px h-12 bg-gray-700"></div>
                        <div className="text-center">
                          <div className="flex items-center justify-center text-amber-400 mb-1">
                            <WifiOff className="w-6 h-6" />
                          </div>
                          <div className="text-sm text-amber-400 uppercase tracking-wider">Offline Mode</div>
                        </div>
                      </>
                    )}

                    {pendingCount > 0 && (
                      <>
                        <div className="w-px h-12 bg-gray-700"></div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-amber-400">{pendingCount}</div>
                          <div className="text-sm text-amber-400 uppercase tracking-wider">Pending Sync</div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* Real-time indicator */}
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-emerald-400 font-medium">Live Updates</span>
                    </div>
                    <Button 
                      onClick={forceRefresh} 
                      variant="outline" 
                      size="sm"
                      className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
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
                       Progress
                     </h3>
                     <p className="text-4xl font-bold text-white mb-1">
                       {stats?.enrollmentProgress || 0}%
                     </p>
                     <p className="text-sm text-gray-400">
                       Enrollment Progress
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
                       <div className="text-sm text-gray-400">System Utilization</div>
                       <div className="text-2xl font-bold text-blue-400">{stats?.utilizationRate || 0}%</div>
                     </div>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {/* Real-time Biometric Analytics */}
                {stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Complete Biometrics */}
                    <div className="bg-black/60 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-emerald-200 text-lg">Complete</h3>
                            <p className="text-sm text-gray-400">All fingerprints</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-emerald-400">{stats.biometric?.complete || 0}</div>
                          <div className="text-sm text-gray-400">Students</div>
                        </div>
                      </div>
                    </div>

                    {/* Partial Biometrics */}
                    <div className="bg-black/60 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-yellow-200 text-lg">Partial</h3>
                            <p className="text-sm text-gray-400">Some fingerprints</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-400">{stats.biometric?.partial || 0}</div>
                          <div className="text-sm text-gray-400">Students</div>
                        </div>
                      </div>
                    </div>

                    {/* Pending Biometrics */}
                    <div className="bg-black/60 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center">
                            <Clock className="h-5 w-5 text-red-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-red-200 text-lg">Pending</h3>
                            <p className="text-sm text-gray-400">No fingerprints</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-400">{stats.biometric?.none || 0}</div>
                          <div className="text-sm text-gray-400">Students</div>
                        </div>
                      </div>
                    </div>

                    {/* System Utilization */}
                    <div className="bg-black/60 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                            <Activity className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-purple-200 text-lg">Utilization</h3>
                            <p className="text-sm text-gray-400">System capacity</p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-400">{stats.utilizationRate || 0}%</div>
                          <div className="text-sm text-gray-400">Used</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-black/80 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Database className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400 mb-2">Loading Analytics...</h3>
                    <p className="text-gray-500">Fetching real-time biometric data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="realtime">Real-time</TabsTrigger>
              <TabsTrigger value="pwa">PWA Center</TabsTrigger>
              <TabsTrigger value="monitoring">Monitor</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PWAManagementPanel />
                <SecurityDashboard />
              </div>
            </TabsContent>

            <TabsContent value="realtime" className="space-y-6">
              <RealTimePWADashboard />
            </TabsContent>

            <TabsContent value="pwa" className="space-y-6">
              <PWAFeatureCenter />
            </TabsContent>

            <TabsContent value="monitoring">
              <RealTimeSystemMonitor />
            </TabsContent>

            <TabsContent value="analytics">
              <BiometricAnalyticsDashboard />
            </TabsContent>

            <TabsContent value="collaboration">
              <RealtimeCollaborationDashboard />
            </TabsContent>

            <TabsContent value="security">
              <div className="grid grid-cols-1 gap-6">
                <SecurityDashboard />
                <PWAControlCenter />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
}