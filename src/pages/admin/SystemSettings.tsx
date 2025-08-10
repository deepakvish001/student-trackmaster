import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Shield, 
  Database, 
  Mail, 
  Bell, 
  Lock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function SystemSettings() {
  const { profile, isLoading, isSuperAdmin } = useUserProfile();
  const { toast } = useToast();
  
  // System settings state
  const [settings, setSettings] = useState({
    // Security Settings
    enableTwoFactor: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireSpecialChars: true,
    
    // System Settings
    enableMaintenanceMode: false,
    maxUsersPerBatch: 50,
    systemName: 'Biometric Management System',
    adminEmail: 'admin@system.com',
    
    // Notification Settings
    enableEmailNotifications: true,
    enableAuditAlerts: true,
    notificationFrequency: 'daily',
    
    // Database Settings
    autoBackupEnabled: true,
    backupRetentionDays: 30,
    performanceMode: 'balanced'
  });

  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !isSuperAdmin()) {
    return <Navigate to="/" replace />;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Success",
        description: "System settings saved successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">System Settings</h2>
            <p className="text-muted-foreground">Configure system-wide settings and security policies</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin accounts
                  </p>
                </div>
                <Switch
                  checked={settings.enableTwoFactor}
                  onCheckedChange={(checked) => updateSetting('enableTwoFactor', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="120"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Login Attempts</Label>
                <Input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
                  min="3"
                  max="10"
                />
              </div>

              <div className="space-y-2">
                <Label>Password Min Length</Label>
                <Input
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => updateSetting('passwordMinLength', parseInt(e.target.value))}
                  min="6"
                  max="20"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Special Characters</Label>
                  <p className="text-sm text-muted-foreground">
                    Passwords must contain special characters
                  </p>
                </div>
                <Switch
                  checked={settings.requireSpecialChars}
                  onCheckedChange={(checked) => updateSetting('requireSpecialChars', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input
                  value={settings.systemName}
                  onChange={(e) => updateSetting('systemName', e.target.value)}
                  placeholder="Enter system name"
                />
              </div>

              <div className="space-y-2">
                <Label>Admin Email</Label>
                <Input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => updateSetting('adminEmail', e.target.value)}
                  placeholder="admin@system.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Users Per Batch</Label>
                <Input
                  type="number"
                  value={settings.maxUsersPerBatch}
                  onChange={(e) => updateSetting('maxUsersPerBatch', parseInt(e.target.value))}
                  min="10"
                  max="200"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable to restrict system access
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.enableMaintenanceMode}
                    onCheckedChange={(checked) => updateSetting('enableMaintenanceMode', checked)}
                  />
                  {settings.enableMaintenanceMode && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send system alerts via email
                  </p>
                </div>
                <Switch
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) => updateSetting('enableEmailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit Log Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert on suspicious activities
                  </p>
                </div>
                <Switch
                  checked={settings.enableAuditAlerts}
                  onCheckedChange={(checked) => updateSetting('enableAuditAlerts', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notification Frequency</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={settings.notificationFrequency}
                  onChange={(e) => updateSetting('notificationFrequency', e.target.value)}
                >
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup database daily
                  </p>
                </div>
                <Switch
                  checked={settings.autoBackupEnabled}
                  onCheckedChange={(checked) => updateSetting('autoBackupEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Backup Retention (days)</Label>
                <Input
                  type="number"
                  value={settings.backupRetentionDays}
                  onChange={(e) => updateSetting('backupRetentionDays', parseInt(e.target.value))}
                  min="7"
                  max="365"
                />
              </div>

              <div className="space-y-2">
                <Label>Performance Mode</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={settings.performanceMode}
                  onChange={(e) => updateSetting('performanceMode', e.target.value)}
                >
                  <option value="high_performance">High Performance</option>
                  <option value="balanced">Balanced</option>
                  <option value="power_saver">Power Saver</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Database Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Badge variant="outline">
                    Last Backup: 2 hours ago
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Version</Label>
                <p className="font-medium">v2.1.0</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Environment</Label>
                <p className="font-medium">Production</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Updated</Label>
                <p className="font-medium">2 days ago</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Database Size</Label>
                <p className="font-medium">2.4 GB</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Active Users</Label>
                <p className="font-medium">127</p>
              </div>
              <div>
                <Label className="text-muted-foreground">System Load</Label>
                <p className="font-medium">Normal (23%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}