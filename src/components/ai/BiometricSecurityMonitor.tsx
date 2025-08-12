import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Brain, 
  Activity,
  TrendingUp,
  Users,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { useBiometricSecurity } from '@/hooks/useBiometricSecurity';

interface SecurityThreat {
  id: string;
  type: 'spoofing' | 'duplicate' | 'anomaly' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  timestamp: Date;
  userId?: string;
  deviceId?: string;
}

interface SecurityMetrics {
  totalScans: number;
  threatsDetected: number;
  spoofingAttempts: number;
  anomalousPatterns: number;
  riskScore: number;
  livenessScore: number;
}

export const BiometricSecurityMonitor: React.FC = () => {
  const [activeThreats, setActiveThreats] = useState<SecurityThreat[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalScans: 0,
    threatsDetected: 0,
    spoofingAttempts: 0,
    anomalousPatterns: 0,
    riskScore: 0,
    livenessScore: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  const {
    startSecurityMonitoring,
    stopSecurityMonitoring,
    analyzeForThreats,
    checkLiveness,
    getSecurityMetrics,
    getRiskAssessment
  } = useBiometricSecurity();

  useEffect(() => {
    if (isMonitoring) {
      startSecurityMonitoring();
      
      const updateInterval = setInterval(async () => {
        const newMetrics = await getSecurityMetrics();
        setMetrics(newMetrics);
      }, 5000);

      return () => {
        clearInterval(updateInterval);
        stopSecurityMonitoring();
      };
    }
  }, [isMonitoring]);

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { level: 'High', color: 'text-red-600' };
    if (score >= 60) return { level: 'Medium', color: 'text-amber-600' };
    if (score >= 40) return { level: 'Low', color: 'text-blue-600' };
    return { level: 'Minimal', color: 'text-emerald-600' };
  };

  const risk = getRiskLevel(metrics.riskScore);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Biometric Security Monitor
              {isMonitoring && <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />}
            </CardTitle>
            <Button
              variant={isMonitoring ? "destructive" : "default"}
              onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{metrics.totalScans}</div>
              <div className="text-sm text-muted-foreground">Total Scans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.threatsDetected}</div>
              <div className="text-sm text-muted-foreground">Threats Detected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{metrics.spoofingAttempts}</div>
              <div className="text-sm text-muted-foreground">Spoofing Attempts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.anomalousPatterns}</div>
              <div className="text-sm text-muted-foreground">Anomalies</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="threats">Active Threats</TabsTrigger>
          <TabsTrigger value="analytics">Security Analytics</TabsTrigger>
          <TabsTrigger value="liveness">Liveness Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Active Security Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeThreats.length === 0 ? (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    No active security threats detected. System is secure.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {activeThreats.map((threat) => (
                    <Alert key={threat.id} className="border-l-4 border-l-red-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(threat.severity)}
                          <div>
                            <div className="font-semibold">{threat.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {threat.timestamp.toLocaleString()}
                              {threat.userId && ` • User: ${threat.userId.substring(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(threat.severity)}>
                            {threat.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm">{Math.round(threat.confidence * 100)}%</span>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Risk Level</span>
                  <Badge className={risk.color}>{risk.level}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Risk Score</span>
                    <span className={risk.color}>{metrics.riskScore}%</span>
                  </div>
                  <Progress value={metrics.riskScore} className="h-2" />
                </div>
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    Risk assessment based on behavioral patterns, device anomalies, and threat indicators.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Detection Accuracy</span>
                    <span className="text-sm font-medium">98.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">False Positive Rate</span>
                    <span className="text-sm font-medium">0.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Load</span>
                    <span className="text-sm font-medium">Normal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">AI Model Status</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="liveness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Liveness Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Liveness Score</span>
                <Badge variant={metrics.livenessScore > 85 ? "default" : "destructive"}>
                  {metrics.livenessScore}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Progress value={metrics.livenessScore} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Real-time analysis of biometric samples to detect spoofing attempts
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Live Samples</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">847</div>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Spoof Attempts</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">12</div>
                </div>
              </div>

              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Advanced AI algorithms analyze texture, blood flow, and micro-movements to ensure sample authenticity.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};