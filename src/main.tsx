import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAllPolyfills, initSafeAreaHandling, initPerformanceOptimizations } from './utils/browserPolyfills'

// Initialize browser compatibility features
initAllPolyfills();
initSafeAreaHandling();
initPerformanceOptimizations();

// Register service worker for PWA with enhanced update detection for all platforms
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered for PWA: ', registration);
        
        // Store registration globally for update component
        (window as any).swRegistration = registration;
        
        // Enhanced update checking for desktop PWA
        const checkForUpdates = () => {
          registration.update().then(() => {
            console.log('Update check completed');
          }).catch(err => {
            console.warn('Update check failed:', err);
          });
        };
        
        // Check for updates every 30 seconds
        setInterval(checkForUpdates, 30000);
        
        // Also check when the app becomes visible (important for desktop PWA)
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            checkForUpdates();
          }
        });
        
        // Check for updates when window gains focus (desktop PWA behavior)
        window.addEventListener('focus', checkForUpdates);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
