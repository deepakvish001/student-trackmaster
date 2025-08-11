import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  Shield, 
  Database, 
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export function SystemStatus() {
  const { isOnline } = useOnlineStatus();
  const { syncToSupabase, isSyncing, pendingCount, lastSyncTime } = useOfflineSync();
  const { user, securityLevel, sessionMetrics } = useEnhancedAuth();
  const [showAuthConfig, setShowAuthConfig] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-emerald-green';
      case 'offline': return 'text-amber-500';
      case 'syncing': return 'text-electric-blue';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-emerald-green bg-emerald-green/10 border-emerald-green/20';
      case 'medium': return 'text-sunset-orange bg-sunset-orange/10 border-sunset-orange/20';
      case 'low': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const currentUrl = window.location.origin;

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-electric-blue" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border">
              {isOnline ? (
                <>
                  <Wifi className="h-5 w-5 text-emerald-green" />
                  <div>
                    <p className="font-medium text-emerald-green">Online</p>
                    <p className="text-xs text-muted-foreground">Connected to server</p>
                  </div>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-500">Offline</p>
                    <p className="text-xs text-muted-foreground">Working offline</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border">
              <Shield className={`h-5 w-5 ${getStatusColor(securityLevel)}`} />
              <div>
                <p className="font-medium">Security</p>
                <Badge variant="outline" className={getSecurityLevelColor(securityLevel)}>
                  {securityLevel.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border">
              <Clock className="h-5 w-5 text-electric-blue" />
              <div>
                <p className="font-medium">Session</p>
                <p className="text-xs text-muted-foreground">
                  {sessionMetrics.loginTime 
                    ? formatDistanceToNow(sessionMetrics.loginTime, { addSuffix: true })
                    : 'Not available'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          {user && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Data Synchronization
                </h4>
                {isOnline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncToSupabase(true)}
                    disabled={isSyncing}
                    className="h-8"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync Now
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending Operations</span>
                    <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>
                      {pendingCount}
                    </Badge>
                  </div>
                  {pendingCount > 0 && (
                    <Progress value={0} className="h-2" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Last Sync</span>
                    <span className="text-muted-foreground text-xs">
                      {lastSyncTime 
                        ? formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {pendingCount > 0 && !isOnline && (
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {pendingCount} operation{pendingCount !== 1 ? 's' : ''} pending sync. 
                    Changes will be synchronized when you reconnect to the internet.
                  </AlertDescription>
                </Alert>
              )}

              {pendingCount === 0 && (
                <Alert className="bg-emerald-green/10 border-emerald-green/20 text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All data is synchronized and up to date.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authentication Configuration Help */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-vibrant-purple" />
            Authentication Configuration
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuthConfig(!showAuthConfig)}
              className="ml-auto"
            >
              {showAuthConfig ? 'Hide' : 'Show'} Config
            </Button>
          </CardTitle>
        </CardHeader>
        {showAuthConfig && (
          <CardContent className="space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                If you're experiencing login issues like "requested path is invalid" or redirects to localhost, 
                configure these URLs in your Supabase dashboard.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Site URL</h4>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm">
                    {currentUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(currentUrl)}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Redirect URLs</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm">
                      {currentUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(currentUrl)}
                    >
                      Copy
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm">
                      {currentUrl}/**
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(`${currentUrl}/**`)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <a 
                    href="https://supabase.com/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Supabase Dashboard
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Go to Authentication → URL Configuration to update these settings
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* PWA Status */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-green" />
            Progressive Web App Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-emerald-green mx-auto mb-2" />
              <p className="text-sm font-medium">Offline Ready</p>
              <p className="text-xs text-muted-foreground">Works without internet</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-emerald-green mx-auto mb-2" />
              <p className="text-sm font-medium">Auto Sync</p>
              <p className="text-xs text-muted-foreground">Syncs when online</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-emerald-green mx-auto mb-2" />
              <p className="text-sm font-medium">Fast Loading</p>
              <p className="text-xs text-muted-foreground">Cached resources</p>
            </div>
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-emerald-green mx-auto mb-2" />
              <p className="text-sm font-medium">Installable</p>
              <p className="text-xs text-muted-foreground">Add to home screen</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}