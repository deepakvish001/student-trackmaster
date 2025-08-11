import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'data_access' | 'permission_change' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  additional_data?: any;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  suspiciousActivities: number;
  failedLogins: number;
  lastSecurityScan: string | null;
  riskScore: number;
}

export function useSecurityMonitoring() {
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    suspiciousActivities: 0,
    failedLogins: 0,
    lastSecurityScan: null,
    riskScore: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Log security events
  const logSecurityEvent = useCallback(async (
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    description: string,
    additionalData?: any
  ) => {
    if (!user) return;

    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      severity,
      description,
      user_id: user.id,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      additional_data: additionalData
    };

    // Store locally first
    setSecurityEvents(prev => [securityEvent, ...prev.slice(0, 99)]); // Keep last 100 events

    // Store in IndexedDB for persistence
    await offlineDb.setMetadata(`security_event_${securityEvent.id}`, securityEvent);

    // If online, also log to Supabase audit logs
    if (isOnline) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: `SECURITY_${type.toUpperCase()}`,
          table_name: 'security_monitoring',
          new_values: {
            severity,
            description,
            type,
            risk_score: getRiskScore(severity),
            additional_data: additionalData
          },
          risk_score: getRiskScore(severity)
        });
      } catch (error) {
        console.error('Failed to log security event to Supabase:', error);
      }
    }

    // Update metrics
    setSecurityMetrics(prev => ({
      ...prev,
      totalEvents: prev.totalEvents + 1,
      criticalEvents: prev.criticalEvents + (severity === 'critical' ? 1 : 0),
      suspiciousActivities: prev.suspiciousActivities + (type === 'suspicious_activity' ? 1 : 0),
      failedLogins: prev.failedLogins + (type === 'login_attempt' && additionalData?.success === false ? 1 : 0),
      riskScore: calculateRiskScore(prev, severity)
    }));

    // Show alerts for high-risk events
    if (severity === 'critical' || severity === 'high') {
      toast.error(`Security Alert: ${description}`, {
        duration: 5000,
        action: {
          label: 'View Details',
          onClick: () => console.log('Security event:', securityEvent)
        }
      });
    }

  }, [user, isOnline]);

  // Get client IP address
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  };

  // Calculate risk score based on severity
  const getRiskScore = (severity: SecurityEvent['severity']): number => {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 7;
      case 'critical': return 10;
      default: return 1;
    }
  };

  // Calculate overall risk score
  const calculateRiskScore = (metrics: SecurityMetrics, newSeverity: SecurityEvent['severity']): number => {
    const newEventRisk = getRiskScore(newSeverity);
    const totalRisk = metrics.riskScore + newEventRisk;
    return Math.min(totalRisk, 100); // Cap at 100
  };

  // Monitor for suspicious patterns
  const detectSuspiciousActivity = useCallback(async () => {
    if (!user) return;

    const recentEvents = securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > Date.now() - 15 * 60 * 1000 // Last 15 minutes
    );

    // Check for rapid failed login attempts
    const failedLogins = recentEvents.filter(event => 
      event.type === 'login_attempt' && event.additional_data?.success === false
    );

    if (failedLogins.length >= 3) {
      await logSecurityEvent(
        'suspicious_activity',
        'high',
        `Multiple failed login attempts detected (${failedLogins.length} attempts)`,
        { failed_attempts: failedLogins.length, timeframe: '15_minutes' }
      );
    }

    // Check for unusual data access patterns
    const dataAccessEvents = recentEvents.filter(event => event.type === 'data_access');
    if (dataAccessEvents.length > 50) {
      await logSecurityEvent(
        'suspicious_activity',
        'medium',
        `Unusual high volume of data access (${dataAccessEvents.length} requests)`,
        { access_count: dataAccessEvents.length, timeframe: '15_minutes' }
      );
    }

  }, [securityEvents, logSecurityEvent, user]);

  // Auto-detect suspicious patterns
  useEffect(() => {
    if (securityEvents.length > 0) {
      const timeoutId = setTimeout(detectSuspiciousActivity, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [securityEvents, detectSuspiciousActivity]);

  // Load saved security events on mount
  useEffect(() => {
    const loadSecurityEvents = async () => {
      if (!user) return;

      try {
        const events: SecurityEvent[] = [];
        const metadata = await offlineDb.app_metadata.toArray();
        
        for (const item of metadata) {
          if (item.key.startsWith('security_event_')) {
            events.push(item.value);
          }
        }

        setSecurityEvents(events.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));

        // Update metrics based on loaded events
        const criticalCount = events.filter(e => e.severity === 'critical').length;
        const suspiciousCount = events.filter(e => e.type === 'suspicious_activity').length;
        const failedLoginCount = events.filter(e => 
          e.type === 'login_attempt' && e.additional_data?.success === false
        ).length;

        setSecurityMetrics({
          totalEvents: events.length,
          criticalEvents: criticalCount,
          suspiciousActivities: suspiciousCount,
          failedLogins: failedLoginCount,
          lastSecurityScan: await offlineDb.getMetadata('last_security_scan'),
          riskScore: events.reduce((total, event) => total + getRiskScore(event.severity), 0)
        });

      } catch (error) {
        console.error('Failed to load security events:', error);
      }
    };

    loadSecurityEvents();
  }, [user]);

  // Perform security scan
  const performSecurityScan = useCallback(async () => {
    if (!user || !isOnline) return;

    setIsMonitoring(true);
    
    try {
      // Check for security policy compliance
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Check for account security issues
      const securityIssues = [];

      if (userProfile?.failed_login_attempts && userProfile.failed_login_attempts > 0) {
        securityIssues.push('Recent failed login attempts detected');
      }

      if (userProfile?.locked_until && new Date(userProfile.locked_until) > new Date()) {
        securityIssues.push('Account is currently locked');
      }

      // Check session validity
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        securityIssues.push('Invalid or expired session');
      }

      // Log security scan results
      await logSecurityEvent(
        'suspicious_activity',
        securityIssues.length > 0 ? 'medium' : 'low',
        `Security scan completed: ${securityIssues.length} issues found`,
        { issues: securityIssues, scan_type: 'manual' }
      );

      await offlineDb.setMetadata('last_security_scan', new Date().toISOString());

      toast.success(`Security scan completed: ${securityIssues.length} issues found`);

    } catch (error) {
      console.error('Security scan failed:', error);
      await logSecurityEvent(
        'suspicious_activity',
        'high',
        'Security scan failed',
        { error: (error as Error).message }
      );
      toast.error('Security scan failed');
    } finally {
      setIsMonitoring(false);
    }
  }, [user, isOnline, logSecurityEvent]);

  // Quick security shortcuts
  const logDataAccess = useCallback((table: string, operation: string, recordCount: number) => {
    logSecurityEvent(
      'data_access',
      'low',
      `Accessed ${recordCount} records from ${table} (${operation})`,
      { table, operation, record_count: recordCount }
    );
  }, [logSecurityEvent]);

  const logPermissionChange = useCallback((targetUser: string, oldRole: string, newRole: string) => {
    logSecurityEvent(
      'permission_change',
      'high',
      `User role changed from ${oldRole} to ${newRole}`,
      { target_user: targetUser, old_role: oldRole, new_role: newRole }
    );
  }, [logSecurityEvent]);

  const logLoginAttempt = useCallback((success: boolean, email?: string, error?: string) => {
    logSecurityEvent(
      'login_attempt',
      success ? 'low' : 'medium',
      success ? 'Successful login' : 'Failed login attempt',
      { success, email: email?.substring(0, 3) + '***', error }
    );
  }, [logSecurityEvent]);

  return {
    securityEvents,
    securityMetrics,
    isMonitoring,
    logSecurityEvent,
    logDataAccess,
    logPermissionChange,
    logLoginAttempt,
    performSecurityScan,
    detectSuspiciousActivity
  };
}