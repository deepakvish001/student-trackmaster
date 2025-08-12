/**
 * Offline Authentication Hook
 * Provides secure token caching and offline session management
 */

import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from '@/lib/offlineDatabase';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

interface OfflineAuthState {
  isOfflineCapable: boolean;
  tokenExpiresAt: Date | null;
  lastSync: Date | null;
  encryptedSession: string | null;
}

interface OfflineTokenQueue {
  id: string;
  type: 'refresh' | 'validate';
  timestamp: Date;
  retryCount: number;
}

export function useOfflineAuth() {
  const { isOnline } = useOnlineStatus();
  const [offlineState, setOfflineState] = useState<OfflineAuthState>({
    isOfflineCapable: false,
    tokenExpiresAt: null,
    lastSync: null,
    encryptedSession: null
  });
  const [tokenQueue, setTokenQueue] = useState<OfflineTokenQueue[]>([]);

  // Encrypt sensitive data for offline storage
  const encryptData = useCallback(async (data: any, key: string): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(JSON.stringify(data));
      const keyBytes = encoder.encode(key.padEnd(32, '0').slice(0, 32));
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        dataBytes
      );
      
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }, []);

  // Decrypt sensitive data from offline storage
  const decryptData = useCallback(async (encryptedData: string, key: string): Promise<any> => {
    try {
      const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const keyBytes = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }, []);

  // Cache session securely for offline use
  const cacheSession = useCallback(async (session: Session | null, userId: string) => {
    if (!session) {
      await offlineDb.setMetadata('offline_session', null);
      setOfflineState(prev => ({ ...prev, encryptedSession: null, isOfflineCapable: false }));
      return;
    }

    try {
      // Create encryption key from user ID and device fingerprint
      const deviceFingerprint = await generateDeviceFingerprint();
      const encryptionKey = `${userId}_${deviceFingerprint}`;
      
      // Only cache essential session data (not the full token)
      const sessionData = {
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          user_metadata: session.user.user_metadata
        },
        expires_at: session.expires_at,
        cached_at: new Date().toISOString()
      };
      
      const encrypted = await encryptData(sessionData, encryptionKey);
      await offlineDb.setMetadata('offline_session', encrypted);
      
      setOfflineState(prev => ({
        ...prev,
        encryptedSession: encrypted,
        isOfflineCapable: true,
        tokenExpiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
        lastSync: new Date()
      }));
      
      console.log('✅ Session cached for offline use');
    } catch (error) {
      console.error('Failed to cache session:', error);
      setOfflineState(prev => ({ ...prev, isOfflineCapable: false }));
    }
  }, [encryptData]);

  // Validate offline session
  const validateOfflineSession = useCallback(async (userId: string): Promise<Session | null> => {
    try {
      const encryptedSession = await offlineDb.getMetadata('offline_session');
      if (!encryptedSession) return null;
      
      const deviceFingerprint = await generateDeviceFingerprint();
      const encryptionKey = `${userId}_${deviceFingerprint}`;
      
      const sessionData = await decryptData(encryptedSession, encryptionKey);
      
      // Check if session is expired
      if (sessionData.expires_at && sessionData.expires_at < Math.floor(Date.now() / 1000)) {
        console.log('⚠️ Offline session expired');
        await offlineDb.setMetadata('offline_session', null);
        return null;
      }
      
      // Check if cached session is too old (more than 24 hours)
      const cachedAt = new Date(sessionData.cached_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        console.log('⚠️ Offline session too old');
        await offlineDb.setMetadata('offline_session', null);
        return null;
      }
      
      // Return a mock session for offline use
      return {
        access_token: 'offline_token',
        token_type: 'bearer',
        expires_at: sessionData.expires_at,
        refresh_token: 'offline_refresh',
        user: sessionData.user
      } as Session;
      
    } catch (error) {
      console.error('Failed to validate offline session:', error);
      return null;
    }
  }, [decryptData]);

  // Generate device fingerprint for encryption
  const generateDeviceFingerprint = useCallback(async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Device fingerprint', 0, 10);
    const canvasFingerprint = canvas.toDataURL();
    
    const fingerprint = btoa([
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvasFingerprint.slice(-50)
    ].join('|'));
    
    return fingerprint.slice(0, 32);
  }, []);

  // Queue token operations for when online
  const queueTokenOperation = useCallback(async (type: 'refresh' | 'validate') => {
    const operation: OfflineTokenQueue = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      retryCount: 0
    };
    
    setTokenQueue(prev => [...prev, operation]);
    await offlineDb.setMetadata('token_queue', [...tokenQueue, operation]);
    
    console.log(`🔄 Queued ${type} operation for when online`);
  }, [tokenQueue]);

  // Process queued token operations when coming online
  const processTokenQueue = useCallback(async () => {
    if (!isOnline || tokenQueue.length === 0) return;
    
    console.log(`🔄 Processing ${tokenQueue.length} queued token operations`);
    
    for (const operation of tokenQueue) {
      try {
        if (operation.type === 'refresh') {
          const { error } = await supabase.auth.refreshSession();
          if (error) throw error;
        } else if (operation.type === 'validate') {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error('Session validation failed');
        }
        
        // Remove successful operation from queue
        setTokenQueue(prev => prev.filter(op => op.id !== operation.id));
        
      } catch (error) {
        console.error(`Failed to process ${operation.type} operation:`, error);
        
        // Increment retry count
        setTokenQueue(prev => prev.map(op => 
          op.id === operation.id 
            ? { ...op, retryCount: op.retryCount + 1 }
            : op
        ));
        
        // Remove operations that have failed too many times
        if (operation.retryCount >= 3) {
          setTokenQueue(prev => prev.filter(op => op.id !== operation.id));
          console.log(`❌ Removed failed operation after 3 retries: ${operation.type}`);
        }
      }
    }
    
    // Update stored queue
    await offlineDb.setMetadata('token_queue', tokenQueue);
  }, [isOnline, tokenQueue]);

  // Check if user can work offline safely
  const canWorkOffline = useCallback((): boolean => {
    if (!offlineState.isOfflineCapable) return false;
    
    // Check if token expires soon (within 1 hour)
    if (offlineState.tokenExpiresAt) {
      const expiresIn = offlineState.tokenExpiresAt.getTime() - Date.now();
      const hoursUntilExpiry = expiresIn / (1000 * 60 * 60);
      
      if (hoursUntilExpiry < 1) {
        console.log('⚠️ Token expires soon, offline capability limited');
        return false;
      }
    }
    
    return true;
  }, [offlineState]);

  // Predict when token will expire and warn user
  const getTokenExpiryWarning = useCallback((): string | null => {
    if (!offlineState.tokenExpiresAt) return null;
    
    const expiresIn = offlineState.tokenExpiresAt.getTime() - Date.now();
    const hoursUntilExpiry = expiresIn / (1000 * 60 * 60);
    
    if (hoursUntilExpiry < 0.5) {
      return 'Your session expires in less than 30 minutes. Connect to internet to refresh.';
    } else if (hoursUntilExpiry < 2) {
      return 'Your session expires in less than 2 hours. Consider connecting to internet soon.';
    }
    
    return null;
  }, [offlineState.tokenExpiresAt]);

  // Process token queue when coming online
  useEffect(() => {
    if (isOnline) {
      processTokenQueue();
    }
  }, [isOnline, processTokenQueue]);

  // Load queued operations on mount
  useEffect(() => {
    const loadTokenQueue = async () => {
      try {
        const storedQueue = await offlineDb.getMetadata('token_queue');
        if (storedQueue && Array.isArray(storedQueue)) {
          setTokenQueue(storedQueue);
        }
      } catch (error) {
        console.error('Failed to load token queue:', error);
      }
    };
    
    loadTokenQueue();
  }, []);

  // Show token expiry warnings
  useEffect(() => {
    const warning = getTokenExpiryWarning();
    if (warning && !isOnline) {
      toast.warning(warning, { duration: 10000 });
    }
  }, [getTokenExpiryWarning, isOnline]);

  return {
    offlineState,
    cacheSession,
    validateOfflineSession,
    queueTokenOperation,
    canWorkOffline,
    getTokenExpiryWarning,
    pendingOperations: tokenQueue.length
  };
}