import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  isFullscreen: boolean;
  hasNotificationPermission: boolean;
  supportsPush: boolean;
  supportsSharing: boolean;
  hasCamera: boolean;
  hasBiometrics: boolean;
  orientation: 'portrait' | 'landscape';
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

interface MobileFeatures {
  vibration: boolean;
  deviceMotion: boolean;
  geolocation: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webgl: boolean;
  workers: boolean;
}

export function useAdvancedPWAFeatures() {
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isFullscreen: false,
    hasNotificationPermission: false,
    supportsPush: false,
    supportsSharing: false,
    hasCamera: false,
    hasBiometrics: false,
    orientation: 'portrait',
    platform: 'unknown'
  });

  const [mobileFeatures, setMobileFeatures] = useState<MobileFeatures>({
    vibration: false,
    deviceMotion: false,
    geolocation: false,
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    webgl: false,
    workers: false
  });

  // Detect device capabilities
  const detectCapabilities = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: PWACapabilities['platform'] = 'unknown';
    
    if (/iphone|ipad|ipod/.test(userAgent)) platform = 'ios';
    else if (/android/.test(userAgent)) platform = 'android';
    else platform = 'desktop';

    // Check if app is installed (running in standalone mode)
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    // Check fullscreen capability
    const isFullscreen = 
      window.innerHeight === screen.height ||
      window.matchMedia('(display-mode: fullscreen)').matches;

    // Check notification permission
    const hasNotificationPermission = 
      'Notification' in window && Notification.permission === 'granted';

    // Check various API support
    const supportsPush = 'serviceWorker' in navigator && 'PushManager' in window;
    const supportsSharing = 'share' in navigator;
    const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    
    // Check for biometric API (experimental)
    const hasBiometrics = 'credentials' in navigator && 'create' in navigator.credentials;

    // Check orientation
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

    setCapabilities({
      isInstallable: false, // Will be updated by beforeinstallprompt event
      isInstalled,
      isFullscreen,
      hasNotificationPermission,
      supportsPush,
      supportsSharing,
      hasCamera,
      hasBiometrics,
      orientation,
      platform
    });

    // Check mobile-specific features
    setMobileFeatures({
      vibration: 'vibrate' in navigator,
      deviceMotion: 'DeviceOrientationEvent' in window,
      geolocation: 'geolocation' in navigator,
      localStorage: 'localStorage' in window,
      sessionStorage: 'sessionStorage' in window,
      indexedDB: 'indexedDB' in window,
      webgl: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      })(),
      workers: 'Worker' in window
    });
  }, []);

  // Enhanced notification system
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    
    setCapabilities(prev => ({ ...prev, hasNotificationPermission: granted }));
    
    if (granted) {
      toast.success('📱 Notifications enabled!');
      
      // Send a welcome notification
      new Notification('Student TrackMaster', {
        body: 'Notifications enabled! You\'ll receive updates about sync status.',
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    } else {
      toast.error('❌ Notification permission denied');
    }
    
    return granted;
  };

  // Enhanced sharing with mobile optimizations
  const shareContent = async (data: {
    title: string;
    text: string;
    url?: string;
    files?: File[];
  }) => {
    if (capabilities.supportsSharing) {
      try {
        await navigator.share(data);
        toast.success('📤 Content shared successfully');
        return true;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
          fallbackShare(data);
        }
        return false;
      }
    } else {
      fallbackShare(data);
      return false;
    }
  };

  // Fallback sharing for unsupported devices
  const fallbackShare = (data: { title: string; text: string; url?: string }) => {
    const shareText = `${data.title}\n${data.text}${data.url ? `\n${data.url}` : ''}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success('📋 Content copied to clipboard');
    } else {
      // Very old browser fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('📋 Content copied to clipboard');
    }
  };

  // Enhanced vibration patterns for mobile feedback
  const vibrate = (pattern: number | number[] = 200) => {
    if (mobileFeatures.vibration) {
      navigator.vibrate(pattern);
    }
  };

  // Provide tactile feedback for specific actions
  const provideFeedback = (type: 'success' | 'error' | 'warning' | 'tap') => {
    const patterns = {
      success: [100, 50, 100],
      error: [300, 100, 300],
      warning: [200, 100, 200, 100, 200],
      tap: [50]
    };
    
    vibrate(patterns[type]);
  };

  // Enhanced camera access for mobile
  const requestCameraAccess = async () => {
    if (!capabilities.hasCamera) {
      toast.error('📷 Camera not available');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera for better fingerprint capture
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      toast.success('📷 Camera access granted');
      return stream;
    } catch (error) {
      console.error('Camera access failed:', error);
      toast.error('❌ Camera access denied');
      return null;
    }
  };

  // Screen orientation lock for mobile forms
  const lockOrientation = async (orientation: 'portrait' | 'landscape') => {
    if ('orientation' in screen && 'lock' in (screen as any).orientation) {
      try {
        await (screen as any).orientation.lock(orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary');
        toast.success(`📱 Screen locked to ${orientation}`);
      } catch (error) {
        console.log('Orientation lock not supported or failed');
      }
    }
  };

  // App-like navigation handling
  const enableMobileNavigation = () => {
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'none';
    
    // Handle mobile back button
    const handlePopState = () => {
      // Custom back button handling for app-like behavior
      if (capabilities.isInstalled) {
        // Implement custom navigation logic
        console.log('Custom back navigation');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.body.style.overscrollBehavior = 'auto';
    };
  };

  // Performance optimizations for mobile
  const optimizeForMobile = () => {
    if (capabilities.platform === 'ios' || capabilities.platform === 'android') {
      // Reduce animations on low-end devices
      if (navigator.hardwareConcurrency <= 2) {
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
      }
      
      // Optimize touch interactions
      document.body.style.touchAction = 'manipulation';
      
      // Reduce memory usage
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
          // Disable heavy animations and reduce image quality
          document.documentElement.classList.add('low-bandwidth');
        }
      }
    }
  };

  // Initialize capabilities detection
  useEffect(() => {
    detectCapabilities();
    optimizeForMobile();
    
    // Listen for orientation changes
    const handleOrientationChange = () => {
      setCapabilities(prev => ({
        ...prev,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      }));
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      setCapabilities(prev => ({ ...prev, isInstallable: true }));
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Mobile navigation setup
    const cleanupNavigation = () => {
      document.body.style.overscrollBehavior = 'auto';
    };
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      cleanupNavigation();
    };
  }, [detectCapabilities]);

  return {
    capabilities,
    mobileFeatures,
    requestNotificationPermission,
    shareContent,
    vibrate,
    provideFeedback,
    requestCameraAccess,
    lockOrientation,
    enableMobileNavigation,
    optimizeForMobile
  };
}