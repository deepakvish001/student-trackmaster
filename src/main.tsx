import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAllPolyfills, initSafeAreaHandling, initPerformanceOptimizations } from './utils/browserPolyfills'

// Initialize browser compatibility features
initAllPolyfills();
initSafeAreaHandling();
initPerformanceOptimizations();

// VitePWA handles service worker registration automatically
// No manual registration needed to avoid conflicts

createRoot(document.getElementById("root")!).render(<App />);
