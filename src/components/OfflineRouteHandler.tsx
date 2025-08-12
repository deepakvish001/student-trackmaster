import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from '@/hooks/use-toast';

/**
 * OfflineRouteHandler - Manages navigation and route handling when offline
 * Ensures all routes work properly in offline mode
 */
export const OfflineRouteHandler = () => {
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle offline navigation
    if (!isOnline) {
      // Store current route for when we come back online
      localStorage.setItem('lastOfflineRoute', location.pathname);
      
      // Show offline notification only once per session
      const hasShownOfflineNotification = sessionStorage.getItem('offlineNotificationShown');
      if (!hasShownOfflineNotification) {
        toast({
          title: "Offline Mode",
          description: "You're offline but can still use the app with cached data.",
          duration: 5000,
        });
        sessionStorage.setItem('offlineNotificationShown', 'true');
      }
    } else {
      // Clear offline notification flag when back online
      sessionStorage.removeItem('offlineNotificationShown');
      
      // Restore route if needed
      const lastRoute = localStorage.getItem('lastOfflineRoute');
      if (lastRoute && lastRoute !== location.pathname) {
        localStorage.removeItem('lastOfflineRoute');
      }
    }
  }, [isOnline, location.pathname, navigate]);

  // Cache critical routes for offline access
  useEffect(() => {
    const criticalRoutes = [
      '/',
      '/dashboard',
      '/students',
      '/batches',
      '/students/add',
      '/login'
    ];
    
    // Preload critical routes when online
    if (isOnline) {
      criticalRoutes.forEach(route => {
        // This helps ensure routes are cached by the service worker
        fetch(route, { method: 'HEAD' }).catch(() => {
          // Ignore errors, this is just for caching
        });
      });
    }
  }, [isOnline]);

  return null; // This component doesn't render anything
};

export default OfflineRouteHandler;