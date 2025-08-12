/**
 * Offline Security Hook
 * Provides comprehensive security validation and monitoring for offline scenarios
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useOnlineStatus } from './useOnlineStatus';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface OfflineSecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'data_access' | 'biometric' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId: string;
  metadata: Record<string, any>;
  timestamp: string;
  synced: boolean;
}

interface SecurityPolicy {
  maxFailedLogins: number;
  sessionTimeout: number;
  biometricRequired: boolean;
  encryptionRequired: boolean;
  auditLevel: 'basic' | 'detailed' | 'comprehensive';
}

interface ThreatDetection {
  rapidFailedLogins: boolean;
  suspiciousLocation: boolean;
  deviceMismatch: boolean;
  timeAnomaly: boolean;
  dataVolumeAnomaly: boolean;
}

export function useOfflineSecurity(user?: User | null, session?: Session | null) {
  const { isOnline } = useOnlineStatus();
  const [securityEvents, setSecurityEvents] = useState<OfflineSecurityEvent[]>([]);
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy>({
    maxFailedLogins: 5,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    biometricRequired: false,
    encryptionRequired: true,
    auditLevel: 'detailed'
  });
  const [threatDetection, setThreatDetection] = useState<ThreatDetection>({
    rapidFailedLogins: false,
    suspiciousLocation: false,
    deviceMismatch: false,
    timeAnomaly: false,
    dataVolumeAnomaly: false
  });
  const [encryptionKeys, setEncryptionKeys] = useState<Map<string, CryptoKey>>(new Map());

  // Log security event (works offline)
  const logSecurityEvent = useCallback(async (
    type: OfflineSecurityEvent['type'],
    severity: OfflineSecurityEvent['severity'],
    description: string,
    metadata: Record<string, any> = {}
  ) => {
    if (!user) return;

    const event: OfflineSecurityEvent = {
      id: crypto.randomUUID(),
      type,
      severity,
      description,
      userId: user.id,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        sessionId: session?.access_token?.slice(-10) || 'offline',
        isOnline
      },
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Store locally
    setSecurityEvents(prev => [event, ...prev.slice(0, 199)]); // Keep last 200 events
    await offlineDb.setMetadata(`security_event_${event.id}`, event);

    // Try to sync if online
    if (isOnline) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: `OFFLINE_SECURITY_${type.toUpperCase()}`,
          table_name: 'offline_security',
          new_values: {
            type,
            severity,
            description,
            metadata: event.metadata,
            risk_score: getSeverityScore(severity)
          },
          risk_score: getSeverityScore(severity)
        });

        // Mark as synced
        event.synced = true;
        await offlineDb.setMetadata(`security_event_${event.id}`, event);
      } catch (error) {
        console.error('Failed to sync security event:', error);
      }
    }

    // Show critical alerts immediately
    if (severity === 'critical' || severity === 'high') {
      toast.error(`Security Alert: ${description}`, {
        duration: 10000,
        action: {
          label: 'Details',
          onClick: () => console.log('Security event:', event)
        }
      });
    }

    // Update threat detection
    updateThreatDetection(event);

  }, [user, session, isOnline]);

  // Get severity score for risk calculation
  const getSeverityScore = useCallback((severity: OfflineSecurityEvent['severity']): number => {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 7;
      case 'critical': return 10;
      default: return 1;
    }
  }, []);

  // Update threat detection based on events
  const updateThreatDetection = useCallback(async (event: OfflineSecurityEvent) => {
    const recentEvents = securityEvents.filter(e => 
      new Date(e.timestamp).getTime() > Date.now() - 15 * 60 * 1000 // Last 15 minutes
    );

    const updates: Partial<ThreatDetection> = {};

    // Check for rapid failed logins
    const failedLogins = recentEvents.filter(e => 
      e.type === 'authentication' && e.metadata.success === false
    ).length;
    if (failedLogins >= 3) {
      updates.rapidFailedLogins = true;
      await logSecurityEvent('suspicious', 'high', `Rapid failed logins detected: ${failedLogins} attempts`);
    }

    // Check for unusual data access volume
    const dataAccess = recentEvents.filter(e => e.type === 'data_access').length;
    if (dataAccess > 50) {
      updates.dataVolumeAnomaly = true;
      await logSecurityEvent('suspicious', 'medium', `High data access volume: ${dataAccess} requests`);
    }

    // Check for time anomalies (access outside normal hours)
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) {
      updates.timeAnomaly = true;
    }

    if (Object.keys(updates).length > 0) {
      setThreatDetection(prev => ({ ...prev, ...updates }));
    }
  }, [securityEvents, logSecurityEvent]);

  // Validate session offline
  const validateOfflineSession = useCallback(async (): Promise<boolean> => {
    if (!session || !user) {
      await logSecurityEvent('authentication', 'medium', 'Session validation failed: No session');
      return false;
    }

    // Check session expiry
    if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
      await logSecurityEvent('authentication', 'high', 'Session validation failed: Session expired');
      return false;
    }

    // Check device consistency (stored device fingerprint)
    const storedFingerprint = await offlineDb.getMetadata(`device_fingerprint_${user.id}`);
    const currentFingerprint = await generateDeviceFingerprint();
    
    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
      await logSecurityEvent('authentication', 'critical', 'Device mismatch detected');
      setThreatDetection(prev => ({ ...prev, deviceMismatch: true }));
      return false;
    }

    // Store current device fingerprint if not exists
    if (!storedFingerprint) {
      await offlineDb.setMetadata(`device_fingerprint_${user.id}`, currentFingerprint);
    }

    await logSecurityEvent('authentication', 'low', 'Session validation successful');
    return true;
  }, [session, user, logSecurityEvent]);

  // Generate device fingerprint
  const generateDeviceFingerprint = useCallback(async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Security fingerprint', 0, 10);
    const canvasFingerprint = canvas.toDataURL();
    
    const fingerprint = btoa([
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      canvasFingerprint.slice(-50)
    ].join('|'));
    
    return fingerprint;
  }, []);

  // Encrypt sensitive data
  const encryptSensitiveData = useCallback(async (data: any, keyId: string): Promise<string> => {
    if (!securityPolicy.encryptionRequired) return JSON.stringify(data);

    try {
      let key = encryptionKeys.get(keyId);
      
      if (!key) {
        // Generate new encryption key
        key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        
        setEncryptionKeys(prev => new Map(prev).set(keyId, key!));
        
        // Store key securely
        const exportedKey = await crypto.subtle.exportKey('jwk', key);
        await offlineDb.setMetadata(`encryption_key_${keyId}`, exportedKey);
      }

      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(JSON.stringify(data));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBytes
      );
      
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      await logSecurityEvent('data_access', 'low', 'Data encrypted successfully');
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      await logSecurityEvent('data_access', 'high', 'Data encryption failed', { error: (error as Error).message });
      throw error;
    }
  }, [securityPolicy.encryptionRequired, encryptionKeys, logSecurityEvent]);

  // Decrypt sensitive data
  const decryptSensitiveData = useCallback(async (encryptedData: string, keyId: string): Promise<any> => {
    if (!securityPolicy.encryptionRequired) return JSON.parse(encryptedData);

    try {
      let key = encryptionKeys.get(keyId);
      
      if (!key) {
        // Load key from storage
        const storedKey = await offlineDb.getMetadata(`encryption_key_${keyId}`);
        if (!storedKey) throw new Error('Encryption key not found');
        
        key = await crypto.subtle.importKey(
          'jwk',
          storedKey,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        );
        
        setEncryptionKeys(prev => new Map(prev).set(keyId, key!));
      }

      const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      await logSecurityEvent('data_access', 'low', 'Data decrypted successfully');
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      await logSecurityEvent('data_access', 'high', 'Data decryption failed', { error: (error as Error).message });
      throw error;
    }
  }, [securityPolicy.encryptionRequired, encryptionKeys, logSecurityEvent]);

  // Perform offline security scan
  const performOfflineSecurityScan = useCallback(async (): Promise<{ issues: string[], riskScore: number }> => {
    const issues: string[] = [];
    let riskScore = 0;

    // Check session validity
    const isSessionValid = await validateOfflineSession();
    if (!isSessionValid) {
      issues.push('Invalid or expired session');
      riskScore += 7;
    }

    // Check for threat indicators
    Object.entries(threatDetection).forEach(([threat, detected]) => {
      if (detected) {
        issues.push(`Threat detected: ${threat}`);
        riskScore += 5;
      }
    });

    // Check recent security events
    const recentCriticalEvents = securityEvents.filter(e => 
      e.severity === 'critical' && 
      new Date(e.timestamp).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
    );

    if (recentCriticalEvents.length > 0) {
      issues.push(`${recentCriticalEvents.length} critical security events in the last hour`);
      riskScore += recentCriticalEvents.length * 3;
    }

    // Check unsynced events
    const unsyncedEvents = securityEvents.filter(e => !e.synced);
    if (unsyncedEvents.length > 10) {
      issues.push(`${unsyncedEvents.length} security events pending sync`);
      riskScore += 2;
    }

    await logSecurityEvent(
      'suspicious',
      issues.length > 0 ? 'medium' : 'low',
      `Security scan completed: ${issues.length} issues found`,
      { issues, riskScore, scanType: 'offline' }
    );

    return { issues, riskScore: Math.min(riskScore, 100) };
  }, [validateOfflineSession, threatDetection, securityEvents, logSecurityEvent]);

  // Sync unsynced security events when online
  const syncSecurityEvents = useCallback(async () => {
    if (!isOnline || !user) return;

    const unsyncedEvents = securityEvents.filter(e => !e.synced);
    if (unsyncedEvents.length === 0) return;

    console.log(`🔄 Syncing ${unsyncedEvents.length} security events`);

    for (const event of unsyncedEvents) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: event.userId,
          action: `OFFLINE_SECURITY_${event.type.toUpperCase()}`,
          table_name: 'offline_security',
          new_values: {
            type: event.type,
            severity: event.severity,
            description: event.description,
            metadata: event.metadata,
            risk_score: getSeverityScore(event.severity),
            offline_timestamp: event.timestamp
          },
          risk_score: getSeverityScore(event.severity)
        });

        // Mark as synced
        event.synced = true;
        await offlineDb.setMetadata(`security_event_${event.id}`, event);
      } catch (error) {
        console.error('Failed to sync security event:', error);
      }
    }

    setSecurityEvents(prev => prev.map(e => 
      unsyncedEvents.find(ue => ue.id === e.id) 
        ? { ...e, synced: true }
        : e
    ));

    console.log('✅ Security events synced');
  }, [isOnline, user, securityEvents, getSeverityScore]);

  // Load security policy and events on mount
  useEffect(() => {
    const loadSecurityData = async () => {
      if (!user) return;

      try {
        // Load security policy
        const storedPolicy = await offlineDb.getMetadata(`security_policy_${user.id}`);
        if (storedPolicy) {
          setSecurityPolicy(storedPolicy);
        }

        // Load security events
        const events: OfflineSecurityEvent[] = [];
        const metadata = await offlineDb.app_metadata.toArray();
        
        for (const item of metadata) {
          if (item.key.startsWith('security_event_')) {
            events.push(item.value);
          }
        }

        setSecurityEvents(events.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));

      } catch (error) {
        console.error('Failed to load security data:', error);
      }
    };

    loadSecurityData();
  }, [user]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncSecurityEvents();
    }
  }, [isOnline, syncSecurityEvents]);

  // Periodic security validation
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user && session) {
        await validateOfflineSession();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user, session, validateOfflineSession]);

  return {
    securityEvents: securityEvents.slice(0, 50), // Return latest 50 events
    securityPolicy,
    threatDetection,
    logSecurityEvent,
    validateOfflineSession,
    encryptSensitiveData,
    decryptSensitiveData,
    performOfflineSecurityScan,
    syncSecurityEvents,
    unsyncedEventCount: securityEvents.filter(e => !e.synced).length,
    riskScore: securityEvents
      .filter(e => new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000)
      .reduce((total, e) => total + getSeverityScore(e.severity), 0)
  };
}