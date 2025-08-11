import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Users, 
  Settings, 
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Download,
  Upload,
  RefreshCw,
  UserCheck,
  Lock,
  Key,
  Eye,
  Monitor
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useSystemHealthMonitoring } from '@/hooks/useSystemHealthMonitoring';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  securityEvents: number;
  systemHealth: string;
  lastBackup: string;
}

export function SuperAdminControlPanel() {
  const { profile, hasRole } = useUserProfile();
  const { activeUsers: onlineUsers } = useRealtimeCollaboration();
  const totalOnlineUsers = onlineUsers.length;
  const { metrics, performHealthCheck } = useSystemHealthMonitoring();
  const { securityEvents, securityMetrics, performSecurityScan } = useSecurityMonitoring();
  
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    securityEvents: 0,
    systemHealth: 'unknown',
    lastBackup: 'Never'
  });
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Only show for super admins
  if (!hasRole('super_admin')) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Access denied. This panel is only available to super administrators.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    setLoading(true);
    try {
      // Get user count
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (last 24 hours)
      const { count: activeCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get recent security events
      const { count: securityCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setStats({
        totalUsers: userCount || 0,
        activeUsers: activeCount || 0,
        totalSessions: totalOnlineUsers,
        securityEvents: securityCount || 0,
        systemHealth: metrics?.overall || 'unknown',
        lastBackup: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to load system stats:', error);
      toast.error('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const performSystemMaintenance = async () => {
    setLoading(true);
    toast.info('Starting system maintenance...');
    
    try {
      // Perform health check
      await performHealthCheck();
      
      // Perform security scan
      await performSecurityScan();
      
      // Refresh stats
      await loadSystemStats();
      
      toast.success('System maintenance completed successfully');
    } catch (error) {
      console.error('System maintenance failed:', error);
      toast.error('System maintenance failed');
    } finally {
      setLoading(false);
    }
  };

  const exportSystemData = async () => {
    setLoading(true);
    toast.info('Preparing system data export...');
    
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        stats,
        systemHealth: metrics,
        securityMetrics,
        onlineUsers: onlineUsers.map(user => ({
          id: user.user_id,
          name: user.full_name,
          activity: user.current_table || 'browsing',
          lastSeen: user.last_seen
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('System data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export system data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Super Admin Control Panel</h2>
            <p className="text-muted-foreground">System administration and monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSystemStats}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={performSystemMaintenance}
            disabled={loading}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Maintenance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportSystemData}
            disabled={loading}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Active (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{totalOnlineUsers}</div>
                <p className="text-xs text-muted-foreground">Online Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className={`w-4 h-4 ${getHealthColor(stats.systemHealth)}`} />
              <div>
                <div className="text-2xl font-bold capitalize">{stats.systemHealth}</div>
                <p className="text-xs text-muted-foreground">System Health</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="security">Security Center</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Database</span>
                    <Badge variant={metrics?.database === 'healthy' ? 'default' : 'destructive'}>
                      {metrics?.database || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Authentication</span>
                    <Badge variant={metrics?.authentication === 'healthy' ? 'default' : 'destructive'}>
                      {metrics?.authentication || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Connectivity</span>
                    <Badge variant={metrics?.connectivity === 'healthy' ? 'default' : 'destructive'}>
                      {metrics?.connectivity || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Storage</span>
                    <Badge variant={metrics?.storage === 'healthy' ? 'default' : 'destructive'}>
                      {metrics?.storage || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Risk Score</span>
                    <Badge variant={securityMetrics.riskScore > 50 ? 'destructive' : 'default'}>
                      {securityMetrics.riskScore}/100
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Critical Events</span>
                    <span className="font-bold text-red-500">{securityMetrics.criticalEvents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Failed Logins</span>
                    <span className="font-bold text-yellow-500">{securityMetrics.failedLogins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Suspicious Activities</span>
                    <span className="font-bold text-orange-500">{securityMetrics.suspiciousActivities}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Active Users ({totalOnlineUsers})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {onlineUsers
                  .filter(user => 
                    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.current_table || 'No activity'} • {user.current_record_id || 'browsing'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityEvents.slice(0, 5).map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{event.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {event.type} • Risk: {event.severity}
                        </div>
                      </div>
                      <Badge
                        variant={
                          event.severity === 'critical' ? 'destructive' :
                          event.severity === 'high' ? 'destructive' :
                          event.severity === 'medium' ? 'secondary' : 'outline'
                        }
                      >
                        {event.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={performSecurityScan}
                  disabled={loading}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Run Security Scan
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  View Audit Logs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Security Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={performSystemMaintenance}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Full System Check
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Database Optimization
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Create Backup
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Maintenance Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Last Health Check:</span>
                    <span>{metrics?.lastCheck ? new Date(metrics.lastCheck).toLocaleString() : 'Never'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Security Scan:</span>
                    <span>{securityMetrics.lastSecurityScan || 'Never'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Backup:</span>
                    <span>{stats.lastBackup}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}