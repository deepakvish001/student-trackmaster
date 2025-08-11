import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAllPolyfills, initSafeAreaHandling, initPerformanceOptimizations } from './utils/browserPolyfills'

// Initialize browser compatibility features
initAllPolyfills();
initSafeAreaHandling();
initPerformanceOptimizations();

// Enhanced service worker registration with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates immediately and then every 30 seconds
        const checkForUpdates = () => {
          registration.update().then(() => {
            console.log('SW update check completed');
          });
        };
        
        checkForUpdates();
        setInterval(checkForUpdates, 30000);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('New SW version found');
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                console.log('New SW installed and ready');
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
