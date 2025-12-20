import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import App from './App.tsx';
import './index.css';

// Prevent noisy blank-screen crashes from transient network failures (e.g., Supabase 503, blocked fetch)
if (typeof window !== 'undefined') {
  let lastNetworkToastAt = 0;

  window.addEventListener('unhandledrejection', (event) => {
    const reason: any = (event as any).reason;
    const message = typeof reason?.message === 'string' ? reason.message : '';
    const stack = typeof reason?.stack === 'string' ? reason.stack : '';

    const isLikelyNetworkFetchError =
      /Failed to fetch/i.test(message) &&
      (/supabase/i.test(stack) || /fetch/i.test(stack));

    if (isLikelyNetworkFetchError) {
      // Avoid noisy console/runtime errors from third-party extensions or transient backend downtime
      event.preventDefault();

      const now = Date.now();
      if (now - lastNetworkToastAt > 7000) {
        lastNetworkToastAt = now;
        toast.error(
          'Network error: cannot reach Supabase right now. If your project is waking up, wait a minute and retry, or disable adblock/security extensions for this site.'
        );
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

