import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedAuth } from '@/contexts/EnhancedAuthContext';
import { toast } from 'sonner';

interface RealtimeUpdate {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_record?: any;
  new_record?: any;
  timestamp: string;
  user_id?: string;
}

interface RealtimeDataSyncOptions {
  tables: string[];
  onUpdate?: (update: RealtimeUpdate) => void;
  enableNotifications?: boolean;
}

export function useRealtimeDataSync(options: RealtimeDataSyncOptions) {
  const { user } = useEnhancedAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const [channels, setChannels] = useState<any[]>([]);

  const addUpdate = useCallback((update: RealtimeUpdate) => {
    setUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100 updates
    
    if (options.onUpdate) {
      options.onUpdate(update);
    }

    // Show notifications for updates from other users
    if (options.enableNotifications && update.user_id !== user?.id) {
      const message = `${update.table} ${update.action.toLowerCase()}d by another user`;
      toast.info(message, {
        duration: 3000,
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      });
    }
  }, [options, user?.id]);

  useEffect(() => {
    if (!options.tables.length) return;

    const newChannels = options.tables.map(tableName => {
      const channel = supabase.channel(`realtime_${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            const update: RealtimeUpdate = {
              table: tableName,
              action: payload.eventType as any,
              old_record: payload.old,
              new_record: payload.new,
              timestamp: new Date().toISOString(),
              user_id: (payload.new as any)?.user_id || (payload.old as any)?.user_id
            };
            
            addUpdate(update);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            console.error(`Realtime subscription error for ${tableName}`);
          }
        });

      return channel;
    });

    setChannels(newChannels);

    return () => {
      newChannels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setIsConnected(false);
    };
  }, [options.tables, addUpdate]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  const getUpdatesByTable = useCallback((tableName: string) => {
    return updates.filter(update => update.table === tableName);
  }, [updates]);

  const getRecentUpdates = useCallback((minutes: number = 5) => {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return updates.filter(update => new Date(update.timestamp) > cutoff);
  }, [updates]);

  return {
    isConnected,
    updates,
    clearUpdates,
    getUpdatesByTable,
    getRecentUpdates,
    totalUpdates: updates.length
  };
}