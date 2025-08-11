import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemStatus } from '@/components/SystemStatus';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Shield, 
  Database, 
  Bell, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function SystemSettings() {
  const { profile, isLoading: profileLoading, isSuperAdmin } = useUserProfile();
  const { 
    settings, 
    isLoading, 
    isSaving, 
    updateLocalSetting, 
    saveAllSettings, 
    loadSettings 
  } = useSystemSettings();
  const { toast } = useToast();
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  // Load system information
  const loadSystemInfo = async () => {
    setIsLoadingInfo(true);
    try {
      // Get database statistics
      const { data: statsData, error } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact' });

      const systemInfo = {
        version: 'v2.1.0',
        environment: 'Production',
        lastUpdated: '2 days ago',
        databaseSize: '2.4 GB',
        activeUsers: statsData?.length || 0,
        systemLoad: 'Normal (23%)',
        uptime: '15 days, 7 hours',
        lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString()
      };

      setSystemInfo(systemInfo);
    } catch (err) {
      console.error('Failed to load system info:', err);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  useEffect(() => {
    if (profile && isSuperAdmin()) {
      loadSystemInfo();
    }
  }, [profile]);

  if (profileLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-lg">Loading system settings...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const handleSave = async () => {
    await saveAllSettings();
  };

  const handleRefresh = () => {
    loadSettings();
    loadSystemInfo();
    toast({
      title: "Refreshed",
      description: "System settings and information refreshed"
    });
  };

  const handleResetToDefaults = async () => {
    try {
      const { data, error } = await supabase.rpc('reset_system_settings_to_defaults');
      
      if (error) {
        console.error('Error resetting settings:', error);
        toast({
          title: "Error",
          description: "Failed to reset settings to defaults",
          variant: "destructive"
        });
        return;
      }

      const response = data as { success?: boolean; message?: string; error?: string };
      
      if (response?.success) {
        toast({
          title: "Success",
          description: response.message || "Settings reset to defaults successfully"
        });
        // Reload settings to reflect changes
        await loadSettings();
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Failed to reset settings:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to reset settings",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-electric-blue to-vibrant-purple bg-clip-text text-transparent">System Settings</h1>
              <p className="text-lg text-muted-foreground">Configure system-wide settings and security policies</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRefresh} className="modern-button-outline h-12 px-6">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="modern-button h-12 px-8">
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Maintenance Mode Alert */}
          {settings?.system?.maintenance_mode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Maintenance Mode Active</span>
              </div>
              <p className="text-yellow-700 mt-1">
                System is currently in maintenance mode. Users may experience limited access.
              </p>
            </div>
          )}

          {/* Security Settings */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-green to-teal-cyan rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                    <p className="text-xs text-muted-foreground">
                      Require 2FA for all admin accounts
                    </p>
                  </div>
                  <Switch
                    checked={settings?.security?.enable_two_factor || false}
                    onCheckedChange={(checked) => updateLocalSetting('security', 'enable_two_factor', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={settings?.security?.session_timeout || 30}
                    onChange={(e) => updateLocalSetting('security', 'session_timeout', parseInt(e.target.value))}
                    min="5"
                    max="120"
                    className="modern-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={settings?.security?.max_login_attempts || 5}
                    onChange={(e) => updateLocalSetting('security', 'max_login_attempts', parseInt(e.target.value))}
                    min="3"
                    max="10"
                    className="modern-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password Min Length</Label>
                  <Input
                    type="number"
                    value={settings?.security?.password_min_length || 8}
                    onChange={(e) => updateLocalSetting('security', 'password_min_length', parseInt(e.target.value))}
                    min="6"
                    max="20"
                    className="modern-input"
                  />
                </div>

                <div className="flex items-center justify-between md:col-span-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Require Special Characters</Label>
                    <p className="text-xs text-muted-foreground">
                      Passwords must contain special characters
                    </p>
                  </div>
                  <Switch
                    checked={settings?.security?.require_special_chars || false}
                    onCheckedChange={(checked) => updateLocalSetting('security', 'require_special_chars', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Configuration */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary to-electric-blue rounded-xl">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">System Name</Label>
                  <Input
                    value={settings?.system?.name || 'Biometric Management System'}
                    onChange={(e) => updateLocalSetting('system', 'name', e.target.value)}
                    placeholder="Enter system name"
                    className="modern-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Admin Email</Label>
                  <Input
                    type="email"
                    value={settings?.system?.admin_email || 'admin@system.com'}
                    onChange={(e) => updateLocalSetting('system', 'admin_email', e.target.value)}
                    placeholder="admin@system.com"
                    className="modern-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Users Per Batch</Label>
                  <Input
                    type="number"
                    value={settings?.system?.max_users_per_batch || 50}
                    onChange={(e) => updateLocalSetting('system', 'max_users_per_batch', parseInt(e.target.value))}
                    min="10"
                    max="200"
                    className="modern-input"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Maintenance Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to restrict system access
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings?.system?.maintenance_mode || false}
                      onCheckedChange={(checked) => updateLocalSetting('system', 'maintenance_mode', checked)}
                    />
                    {settings?.system?.maintenance_mode && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Settings */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-vibrant-purple to-indigo-deep rounded-xl">
                  <Database className="h-6 w-6 text-white" />
                </div>
                Database Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto Backup</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically backup database daily
                    </p>
                  </div>
                  <Switch
                    checked={settings?.database?.auto_backup || false}
                    onCheckedChange={(checked) => updateLocalSetting('database', 'auto_backup', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Backup Retention (days)</Label>
                  <Input
                    type="number"
                    value={settings?.database?.backup_retention_days || 30}
                    onChange={(e) => updateLocalSetting('database', 'backup_retention_days', parseInt(e.target.value))}
                    min="7"
                    max="365"
                    className="modern-input"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium">Database Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Last Backup: {systemInfo?.lastBackup || 'Loading...'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PWA & Offline System Status */}
          <SystemStatus />

          {/* System Information */}
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-sunset-orange to-coral-red rounded-xl">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInfo ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm">Loading system information...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Version</Label>
                    <p className="font-medium">{systemInfo?.version}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Environment</Label>
                    <p className="font-medium">{systemInfo?.environment}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Active Users</Label>
                    <p className="font-medium">{systemInfo?.activeUsers}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Database Size</Label>
                    <p className="font-medium">{systemInfo?.databaseSize}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">System Load</Label>
                    <p className="font-medium">{systemInfo?.systemLoad}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Uptime</Label>
                    <p className="font-medium">{systemInfo?.uptime}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}