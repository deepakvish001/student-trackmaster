import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAllPolyfills, initSafeAreaHandling, initPerformanceOptimizations } from './utils/browserPolyfills'

// Initialize browser compatibility features
initAllPolyfills();
initSafeAreaHandling();
initPerformanceOptimizations();

// Register service worker for PWA with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Store registration globally for update component
        (window as any).swRegistration = registration;
        
        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update();
        }, 30000);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
