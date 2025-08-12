/**
 * Offline Authentication Manager Component
 * Provides visual feedback and management for offline authentication state
 */

import React, { useState } from 'react';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOfflineAuth } from '@/hooks/useOfflineAuth';
import { useOfflineRoles } from '@/hooks/useOfflineRoles';
import { useOfflineSecurity } from '@/hooks/useOfflineSecurity';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Wifi, 
  WifiOff, 
  Clock, 
  Key, 
  UserCheck, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function OfflineAuthManager() {
  const { user, canWorkOffline, offlineCapable, tokenExpiresAt } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const offlineAuth = useOfflineAuth();
  const offlineRoles = useOfflineRoles();
  const offlineSecurity = useOfflineSecurity();
  const [isPerformingScan, setIsPerformingScan] = useState(false);

  const handleSecurityScan = async () => {
    setIsPerformingScan(true);
    try {
      await offlineSecurity.performOfflineSecurityScan();
    } finally {
      setIsPerformingScan(false);
    }
  };

  const getTokenExpiryProgress = () => {
    if (!tokenExpiresAt) return 100;
    
    const now = Date.now();
    const expiry = tokenExpiresAt.getTime();
    const totalTime = 24 * 60 * 60 * 1000; // 24 hours
    const remainingTime = expiry - now;
    
    return Math.max(0, Math.min(100, (remainingTime / totalTime) * 100));
  };

  const getExpiryStatus = () => {
    if (!tokenExpiresAt) return 'unknown';
    
    const hoursUntilExpiry = (tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    
    if (hoursUntilExpiry < 0) return 'expired';
    if (hoursUntilExpiry < 1) return 'critical';
    if (hoursUntilExpiry < 6) return 'warning';
    return 'good';
  };

  if (!user) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Offline Authentication Status
        </CardTitle>
        <CardDescription>
          Manage your offline authentication and security settings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-success" />
            ) : (
              <WifiOff className="h-5 w-5 text-warning" />
            )}
            <div>
              <p className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? 'Connected to internet'
                  : 'Working in offline mode'
                }
              </p>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"}>
            {isOnline ? 'Connected' : 'Offline'}
          </Badge>
        </div>

        {/* Offline Capability */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {offlineCapable ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className="font-medium">Offline Capability</p>
              <p className="text-sm text-muted-foreground">
                {offlineCapable 
                  ? 'You can work offline safely'
                  : 'Limited offline functionality'
                }
              </p>
            </div>
          </div>
          <Badge variant={offlineCapable ? "default" : "destructive"}>
            {offlineCapable ? 'Ready' : 'Limited'}
          </Badge>
        </div>

        {/* Token Expiry */}
        {tokenExpiresAt && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Session Expires</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(tokenExpiresAt, { addSuffix: true })}
              </span>
            </div>
            
            <Progress value={getTokenExpiryProgress()} className="h-2" />
            
            {getExpiryStatus() !== 'good' && (
              <Alert variant={getExpiryStatus() === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {getExpiryStatus() === 'critical' 
                    ? 'Your session expires very soon. Connect to internet to refresh.'
                    : 'Your session will expire soon. Consider connecting to internet.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Role Information */}
        {offlineRoles.offlineRoles && (
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="font-medium">Role & Permissions</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Role:</span>
                <span className="ml-2 font-medium">{offlineRoles.offlineRoles.role}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={offlineRoles.offlineRoles.isActive ? "default" : "destructive"} className="ml-2">
                  {offlineRoles.offlineRoles.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Batch Access:</span>
                <span className="ml-2 font-medium">{offlineRoles.offlineRoles.batchAccess.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Permissions:</span>
                <span className="ml-2 font-medium">{offlineRoles.offlineRoles.permissions.length}</span>
              </div>
            </div>

            {offlineRoles.roleConflicts.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {offlineRoles.roleConflicts.length} role conflicts detected. 
                  <Button 
                    variant="link" 
                    className="p-0 ml-1 h-auto"
                    onClick={() => offlineRoles.resolveConflicts('prefer_remote')}
                  >
                    Resolve now
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Security Status */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="font-medium">Security Status</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSecurityScan}
              disabled={isPerformingScan}
            >
              {isPerformingScan ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                'Run Scan'
              )}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Risk Score:</span>
              <span className="ml-2 font-medium">{offlineSecurity.riskScore}/100</span>
            </div>
            <div>
              <span className="text-muted-foreground">Unsynced Events:</span>
              <span className="ml-2 font-medium">{offlineSecurity.unsyncedEventCount}</span>
            </div>
          </div>

          {Object.entries(offlineSecurity.threatDetection).some(([_, detected]) => detected) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Security threats detected. Review security events for details.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!isOnline && offlineAuth.pendingOperations > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {offlineAuth.pendingOperations} authentication operations queued for sync
              </AlertDescription>
            </Alert>
          )}
          
          {isOnline && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                offlineRoles.syncRoles();
                offlineSecurity.syncSecurityEvents();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All Data
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}