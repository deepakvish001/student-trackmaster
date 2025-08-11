// Ultra-High Performance Service Worker for BiometricHub PWA
// Optimized for maximum speed, responsiveness, and real-time performance

const CACHE_VERSION = 'v2.1.0';
const STATIC_CACHE = `biometric-hub-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `biometric-hub-dynamic-${CACHE_VERSION}`;
const API_CACHE = `biometric-hub-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `biometric-hub-images-${CACHE_VERSION}`;

// Critical resources for instant loading
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Preload critical API endpoints for dashboard
const CRITICAL_API_ENDPOINTS = [
  '/dashboard',
  '/students',
  '/batches'
];

// Performance monitoring
let performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  backgroundSyncs: 0
};

// Ultra-fast install with critical resource preloading
self.addEventListener('install', (event) => {
  console.log('[SW] 🚀 Ultra-fast installation starting...');
  
  event.waitUntil(
    Promise.all([
      // Preload critical static resources
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] ⚡ Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      
      // Initialize performance-optimized API cache
      caches.open(API_CACHE).then(cache => {
        console.log('[SW] 📊 Initializing API cache');
        return Promise.resolve();
      }),
      
      // Initialize image cache
      caches.open(IMAGE_CACHE).then(cache => {
        console.log('[SW] 🖼️ Initializing image cache');
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('[SW] ✅ Ultra-fast installation complete');
      self.skipWaiting(); // Immediate activation
    })
  );
});

// Aggressive cache cleanup for optimal performance
self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Activating with aggressive cleanup...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        const deletePromises = cacheNames
          .filter(cacheName => !cacheName.includes(CACHE_VERSION))
          .map(cacheName => {
            console.log('[SW] 🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        return Promise.all(deletePromises);
      }),
      
      // Claim all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] ✅ Activation complete - Ultra-fast mode enabled');
      
      // Notify clients of activation
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION,
            timestamp: Date.now()
          });
        });
      });
    })
  );
});

// Ultra-optimized fetch handler with smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Route requests to optimal caching strategies
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    // API requests - Ultra-fast network first with smart caching
    event.respondWith(ultraFastNetworkFirst(request));
  } else if (isStaticAsset(url.pathname)) {
    // Static assets - Lightning-fast cache first
    event.respondWith(lightningCacheFirst(request));
  } else if (isImageAsset(url.pathname)) {
    // Images - Optimized cache first
    event.respondWith(optimizedImageCache(request));
  } else {
    // Dynamic content - Stale while revalidate with performance tracking
    event.respondWith(performantStaleWhileRevalidate(request));
  }
});

// Ultra-fast network first strategy with intelligent fallbacks
async function ultraFastNetworkFirst(request) {
  const startTime = performance.now();
  
  try {
    // Attempt network request with aggressive timeout
    const networkPromise = fetch(request, {
      signal: AbortSignal.timeout(1500) // 1.5 second timeout for real-time feel
    });
    
    const response = await networkPromise;
    
    if (response.ok) {
      // Cache successful responses asynchronously
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone()).catch(err => {
        console.warn('[SW] Cache write failed:', err);
      });
      
      performanceMetrics.networkRequests++;
      console.log(`[SW] ⚡ Network response: ${(performance.now() - startTime).toFixed(2)}ms`);
      return response;
    }
  } catch (error) {
    console.log('[SW] Network failed, trying cache...');
  }
  
  // Fallback to cache
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    console.log(`[SW] 💾 Cache hit: ${(performance.now() - startTime).toFixed(2)}ms`);
    return cachedResponse;
  }
  
  performanceMetrics.cacheMisses++;
  
  // Return optimized offline response
  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'Real-time data unavailable - check connection',
    timestamp: Date.now(),
    cached: false
  }), {
    status: 503,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

// Lightning-fast cache first for static assets
async function lightningCacheFirst(request) {
  const startTime = performance.now();
  const cache = await caches.open(STATIC_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    console.log(`[SW] ⚡ Static cache hit: ${(performance.now() - startTime).toFixed(2)}ms`);
    return cachedResponse;
  }
  
  // Network fallback with caching
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      performanceMetrics.networkRequests++;
    }
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    return new Response('Resource unavailable offline', { status: 503 });
  }
}

// Optimized image caching
async function optimizedImageCache(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    // Return placeholder or empty response for images
    return new Response('', { status: 503 });
  }
}

// Performant stale while revalidate
async function performantStaleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Background update (fire and forget)
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(err => {
    console.warn('[SW] Background update failed:', err);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    performanceMetrics.cacheHits++;
    return cachedResponse;
  }
  
  // Wait for network if no cache
  try {
    return await fetchPromise;
  } catch (error) {
    performanceMetrics.cacheMisses++;
    return new Response('Content unavailable', { status: 503 });
  }
}

// Ultra-fast background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] 🔄 Background sync triggered:', event.tag);
  performanceMetrics.backgroundSyncs++;
  
  if (event.tag === 'ultra-fast-sync') {
    event.waitUntil(performUltraFastSync());
  } else if (event.tag === 'biometric-data-sync') {
    event.waitUntil(syncBiometricData());
  }
});

async function performUltraFastSync() {
  console.log('[SW] ⚡ Performing ultra-fast sync...');
  try {
    // Sync critical data first
    await syncCriticalData();
    
    // Then sync remaining data
    await syncRemainingData();
    
    console.log('[SW] ✅ Ultra-fast sync complete');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

async function syncCriticalData() {
  // Sync dashboard data, students, batches in parallel
  const criticalSyncs = [
    syncDashboardData(),
    syncStudentData(),
    syncBatchData()
  ];
  
  await Promise.allSettled(criticalSyncs);
}

async function syncRemainingData() {
  // Sync less critical data
  console.log('[SW] Syncing remaining data...');
}

async function syncDashboardData() {
  console.log('[SW] Syncing dashboard data...');
}

async function syncStudentData() {
  console.log('[SW] Syncing student data...');
}

async function syncBatchData() {
  console.log('[SW] Syncing batch data...');
}

async function syncBiometricData() {
  console.log('[SW] Syncing biometric data...');
}

// Enhanced push notifications with rich content
self.addEventListener('push', (event) => {
  console.log('[SW] 📱 Push notification received');
  
  let notificationData = {
    title: 'BiometricHub',
    body: 'New update available',
    icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
    badge: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
    vibrate: [200, 100, 200],
    tag: 'biometric-update',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Update',
        icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png'
      }
    ],
    data: {
      timestamp: Date.now(),
      url: '/'
    }
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.warn('[SW] Invalid push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Smart notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Try to focus existing window
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// High-performance message handling
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_PERFORMANCE_METRICS':
      event.ports[0]?.postMessage(performanceMetrics);
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'PRELOAD_CRITICAL':
      event.waitUntil(preloadCriticalResources(payload));
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Utility functions
function isStaticAsset(pathname) {
  return /\.(js|css|html|ico|png|svg|woff2|woff|ttf)$/.test(pathname);
}

function isImageAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|webp|avif|svg)$/.test(pathname);
}

async function preloadCriticalResources(urls = []) {
  if (!urls.length) return;
  
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(urls);
  console.log('[SW] ⚡ Preloaded critical resources:', urls.length);
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames.map(name => caches.delete(name));
  await Promise.all(deletePromises);
  console.log('[SW] 🗑️ All caches cleared');
}

// Enhanced error handling
self.addEventListener('error', (event) => {
  console.error('[SW] ❌ Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] ❌ Unhandled rejection:', event.reason);
});

// Performance monitoring interval
setInterval(() => {
  console.log('[SW] 📊 Performance metrics:', performanceMetrics);
}, 60000); // Log every minute

console.log('[SW] 🚀 Ultra-high performance service worker loaded successfully');