import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { useOnlineStatus } from './useOnlineStatus';

interface CollaborationEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  user_id: string;
  timestamp: string;
}

interface ActiveUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  last_seen: string;
  current_table?: string;
  current_record_id?: string;
}

export function useRealtimeCollaboration() {
  const queryClient = useQueryClient();
  const { user } = useEnhancedAuth();
  const { isOnline } = useOnlineStatus();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentCollaborationEvents, setRecentCollaborationEvents] = useState<CollaborationEvent[]>([]);
  
  const presenceChannelRef = useRef<any>(null);
  const isInitialized = useRef(false);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setupRealTimeCollaboration = useCallback(async () => {
    if (!user || !isOnline || presenceChannelRef.current || isInitialized.current) return;
    
    console.log('🚀 Setting up real-time collaboration...');
    isInitialized.current = true;

    try {
      presenceChannelRef.current = supabase
        .channel('user-presence')
        .on('presence', { event: 'sync' }, () => {
          const newState = presenceChannelRef.current.presenceState();
          const users = Object.keys(newState).map(presenceId => {
            const presence = newState[presenceId][0];
            return {
              user_id: presence.user_id,
              full_name: presence.full_name || 'Anonymous',
              avatar_url: presence.avatar_url,
              last_seen: new Date().toISOString(),
              current_table: presence.current_table,
              current_record_id: presence.current_record_id
            };
          });
          setActiveUsers(users);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('👋 User joined:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('👋 User left:', leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            const userStatus = {
              user_id: user.id,
              full_name: user.email,
              online_at: new Date().toISOString(),
            };
            
            await presenceChannelRef.current.track(userStatus);
          }
        });
    } catch (error) {
      console.error('[Collaboration] Setup failed:', error);
      isInitialized.current = false;
    }
  }, [user?.id, isOnline]);

  const cleanupChannels = useCallback(() => {
    if (cleanupTimeoutRef.current) return; // Prevent multiple cleanups
    
    cleanupTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current) {
        console.log('🔄 Cleaning up collaboration channels');
        
        try {
          supabase.removeChannel(presenceChannelRef.current);
        } catch (error) {
          console.warn('[Collaboration] Cleanup error:', error);
        }
        
        presenceChannelRef.current = null;
      }
      
      setActiveUsers([]);
      isInitialized.current = false;
      cleanupTimeoutRef.current = null;
    }, 500); // Small delay to prevent rapid cleanup/setup cycles
  }, []);

  // Stable effect with proper debouncing
  useEffect(() => {
    // Clear any existing timeouts
    if (setupTimeoutRef.current) {
      clearTimeout(setupTimeoutRef.current);
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (user && isOnline && !isInitialized.current) {
      // Delay setup to prevent rapid initialization
      setupTimeoutRef.current = setTimeout(() => {
        setupRealTimeCollaboration();
      }, 3000); // 3 second delay
    } else if (!user || !isOnline) {
      cleanupChannels();
    }

    return () => {
      if (setupTimeoutRef.current) {
        clearTimeout(setupTimeoutRef.current);
      }
    };
  }, [user?.id, isOnline, setupRealTimeCollaboration, cleanupChannels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupChannels();
    };
  }, [cleanupChannels]);

  const updateUserContext = useCallback(async (table: string, recordId?: string) => {
    if (!presenceChannelRef.current || !user) return;

    try {
      await presenceChannelRef.current.track({
        user_id: user.id,
        full_name: user.email,
        current_table: table,
        current_record_id: recordId,
        last_activity: new Date().toISOString()
      });
    } catch (error) {
      console.warn('[Collaboration] Failed to update context:', error);
    }
  }, [user?.id]);

  // Compatibility aliases
  const updatePresence = updateUserContext;

  return {
    activeUsers,
    recentCollaborationEvents,
    isCollaborationActive: !!presenceChannelRef.current && isOnline,
    updateUserContext,
    updatePresence
  };
}