import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Eye, 
  Lock, 
  Users, 
  Clock,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { formatDistanceToNow } from 'date-fns';

export function SecurityDashboard() {
  const {
    securityEvents,
    securityMetrics,
    isMonitoring,
    performSecurityScan,
    logDataAccess,
    logPermissionChange
  } = useSecurityMonitoring();

  const getRiskLevelColor = (riskScore: number) => {
    if (riskScore <= 20) return 'text-green-600 bg-green-50 border-green-200';
    if (riskScore <= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (riskScore <= 80) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskLevelText = (riskScore: number) => {
    if (riskScore <= 20) return 'Low Risk';
    if (riskScore <= 50) return 'Medium Risk';
    if (riskScore <= 80) return 'High Risk';
    return 'Critical Risk';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Eye className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Security Dashboard
        </h2>
        <Button 
          onClick={() => performSecurityScan()}
          disabled={isMonitoring}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isMonitoring ? 'animate-spin' : ''}`} />
          {isMonitoring ? 'Scanning...' : 'Security Scan'}
        </Button>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Security events logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Critical Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{securityMetrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-600" />
              Failed Logins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{securityMetrics.failedLogins}</div>
            <p className="text-xs text-muted-foreground">Authentication failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-600" />
              Suspicious Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{securityMetrics.suspiciousActivities}</div>
            <p className="text-xs text-muted-foreground">Anomalies detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Overall Risk Score</h3>
                <p className="text-sm text-muted-foreground">
                  Based on recent security events and patterns
                </p>
              </div>
              <Badge className={`${getRiskLevelColor(securityMetrics.riskScore)} border`}>
                {getRiskLevelText(securityMetrics.riskScore)}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Risk Level</span>
                <span>{securityMetrics.riskScore}/100</span>
              </div>
              <Progress 
                value={securityMetrics.riskScore} 
                className="h-2"
              />
            </div>

            {securityMetrics.riskScore > 50 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Elevated risk level detected. Review recent security events and consider implementing additional security measures.
                </AlertDescription>
              </Alert>
            )}

            {securityMetrics.lastSecurityScan && (
              <p className="text-xs text-muted-foreground">
                Last security scan: {formatDistanceToNow(new Date(securityMetrics.lastSecurityScan))} ago
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityEvents.length > 0 ? (
            <div className="space-y-3">
              {securityEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="mt-0.5">
                    {getSeverityIcon(event.severity)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{event.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(event.timestamp))} ago
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.user_id?.substring(0, 8) || 'Unknown'}...
                      </span>
                      {event.ip_address && event.ip_address !== 'unknown' && (
                        <span>IP: {event.ip_address}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No security events recorded</p>
              <p className="text-sm">Your system appears secure</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Security Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => logDataAccess('students', 'SELECT', 10)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Test Data Access Log
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => logPermissionChange('test-user', 'user', 'admin')}
            >
              <Lock className="h-4 w-4 mr-2" />
              Test Permission Change
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.open('/admin/audit-logs', '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              View Audit Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}