import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface PWANotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'normal' | 'high';
}

interface PWANotificationState {
  notifications: PWANotification[];
  permission: NotificationPermission;
  isSupported: boolean;
  subscribed: boolean;
}

export function usePWANotifications() {
  const [state, setState] = useState<PWANotificationState>({
    notifications: [],
    permission: 'default',
    isSupported: 'Notification' in window,
    subscribed: false
  });

  const notificationRefs = useRef<{ [key: string]: boolean }>({});

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        toast.success('Notifications enabled');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[PWANotifications] Permission request failed:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [state.isSupported]);

  const showNotification = useCallback(async (
    title: string, 
    options?: {
      body?: string;
      icon?: string;
      tag?: string;
      priority?: 'low' | 'normal' | 'high';
      silent?: boolean;
      requireInteraction?: boolean;
      data?: any;
    }
  ) => {
    if (!state.isSupported || state.permission !== 'granted') {
      // Fallback to toast if notifications not available
      toast.info(`${title}: ${options?.body || ''}`);
      return;
    }

    // Prevent duplicate notifications with the same tag
    if (options?.tag && notificationRefs.current[options.tag]) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
        tag: options?.tag,
        silent: options?.silent || false,
        requireInteraction: options?.requireInteraction || false,
        data: options?.data
      });

      // Track notification to prevent duplicates
      if (options?.tag) {
        notificationRefs.current[options.tag] = true;
        
        // Clear tracking after notification is closed
        notification.onclose = () => {
          delete notificationRefs.current[options.tag];
        };
      }

      // Store notification in state
      const pwaNotification: PWANotification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        body: options?.body || '',
        icon: options?.icon,
        tag: options?.tag,
        timestamp: Date.now(),
        read: false,
        priority: options?.priority || 'normal'
      };

      setState(prev => ({
        ...prev,
        notifications: [pwaNotification, ...prev.notifications].slice(0, 50) // Keep only 50 recent
      }));

      return notification;
    } catch (error) {
      console.error('[PWANotifications] Failed to show notification:', error);
      toast.error('Failed to show notification');
    }
  }, [state.isSupported, state.permission]);

  const clearNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    }));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: []
    }));
    notificationRefs.current = {};
  }, []);

  const showBiometricNotification = useCallback((studentName: string, action: string) => {
    showNotification(
      'Biometric Update',
      {
        body: `${action} for ${studentName}`,
        tag: `biometric-${studentName}-${action}`,
        priority: 'high',
        icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png'
      }
    );
  }, [showNotification]);

  const showSyncNotification = useCallback((message: string, success: boolean = true) => {
    showNotification(
      success ? 'Sync Complete' : 'Sync Failed',
      {
        body: message,
        tag: 'sync-status',
        priority: success ? 'normal' : 'high',
        silent: success
      }
    );
  }, [showNotification]);

  const showConnectionNotification = useCallback((isConnected: boolean) => {
    showNotification(
      isConnected ? 'Connected' : 'Connection Lost',
      {
        body: isConnected ? 'Real-time sync is active' : 'Working in offline mode',
        tag: 'connection-status',
        priority: 'normal',
        silent: true
      }
    );
  }, [showNotification]);

  const getUnreadCount = useCallback(() => {
    return state.notifications.filter(n => !n.read).length;
  }, [state.notifications]);

  const getNotificationsByPriority = useCallback((priority: 'low' | 'normal' | 'high') => {
    return state.notifications.filter(n => n.priority === priority);
  }, [state.notifications]);

  return {
    ...state,
    requestPermission,
    showNotification,
    clearNotification,
    markAsRead,
    clearAllNotifications,
    showBiometricNotification,
    showSyncNotification,
    showConnectionNotification,
    getUnreadCount,
    getNotificationsByPriority
  };
}