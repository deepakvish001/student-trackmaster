import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAllPolyfills, initSafeAreaHandling, initPerformanceOptimizations } from './utils/browserPolyfills'

// Initialize browser compatibility features
initAllPolyfills();
initSafeAreaHandling();
initPerformanceOptimizations();

// PWA service worker is now handled by Vite PWA plugin with injectManifest strategy

createRoot(document.getElementById("root")!).render(<App />);
