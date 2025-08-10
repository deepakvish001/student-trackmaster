// Enhanced service worker with advanced caching strategies
const CACHE_NAME = 'student-trackmaster-v2';
const STATIC_CACHE_NAME = 'static-v2';
const DYNAMIC_CACHE_NAME = 'dynamic-v2';
const IMAGE_CACHE_NAME = 'images-v2';
const API_CACHE_NAME = 'api-v2';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Critical resources with different strategies
const CACHE_STRATEGIES_MAP = [
  {
    pattern: /\.(?:js|css|woff2?|ttf|eot)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: STATIC_CACHE_NAME,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 200
  },
  {
    pattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cacheName: IMAGE_CACHE_NAME,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100
  },
  {
    pattern: /\/api\/(students|batches|dashboard)/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cacheName: API_CACHE_NAME,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50,
    networkTimeout: 3000
  },
  {
    pattern: /\/(login|dashboard|students)/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cacheName: DYNAMIC_CACHE_NAME,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxEntries: 20
  }
];

// Install event with performance optimizations
self.addEventListener('install', event => {
  console.log('🔧 Enhanced Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache critical resources immediately
      caches.open(STATIC_CACHE_NAME).then(cache => {
        const criticalResources = [
          '/',
          '/manifest.json',
          '/favicon.ico',
          // Critical CSS and JS will be added by build process
        ];
        return cache.addAll(criticalResources);
      }),
      // Skip waiting for immediate activation
      self.skipWaiting()
    ])
  );
});

// Activate event with intelligent cache cleanup
self.addEventListener('activate', event => {
  console.log('🚀 Enhanced Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              const currentCaches = [
                STATIC_CACHE_NAME,
                DYNAMIC_CACHE_NAME,
                IMAGE_CACHE_NAME,
                API_CACHE_NAME
              ];
              return !currentCaches.includes(cacheName);
            })
            .map(cacheName => {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Claim all clients immediately
      self.clients.claim(),
      // Clean up old entries in existing caches
      cleanupCaches()
    ])
  );
});

// Enhanced fetch handler with intelligent routing
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Find matching cache strategy
  const strategy = CACHE_STRATEGIES_MAP.find(({ pattern }) => 
    pattern.test(url.pathname) || pattern.test(url.href)
  );

  if (strategy) {
    event.respondWith(
      handleRequest(request, strategy)
    );
  }
});

// Intelligent request handler
async function handleRequest(request, strategy) {
  const { strategy: strategyType, cacheName, maxAge, networkTimeout } = strategy;

  switch (strategyType) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName, maxAge);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName, maxAge, networkTimeout);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName, maxAge);
    
    default:
      return fetch(request);
  }
}

// Cache first strategy with expiration
async function cacheFirst(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cache entry is still valid
      const cachedDate = new Date(cachedResponse.headers.get('sw-cache-date') || 0);
      const isExpired = Date.now() - cachedDate.getTime() > maxAge;
      
      if (!isExpired) {
        return cachedResponse;
      }
    }
    
    // Fetch fresh content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      // Add timestamp header
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', new Date().toISOString());
      
      const responseWithHeaders = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, responseWithHeaders);
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache if available
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline - Resource not available', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network first with timeout and cache fallback
async function networkFirst(request, cacheName, maxAge, timeout = 3000) {
  try {
    const networkPromise = fetch(request);
    
    // Race network request against timeout
    const networkResponse = await Promise.race([
      networkPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      // Add cache metadata
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', new Date().toISOString());
      headers.set('X-Served-From', 'network');
      
      const responseWithHeaders = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, responseWithHeaders);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Network failed, checking cache:', error.message);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cached version is still acceptable
      const cachedDate = new Date(cachedResponse.headers.get('sw-cache-date') || 0);
      const age = Date.now() - cachedDate.getTime();
      
      // Return cached version with offline indicator
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-From', 'cache');
      headers.set('X-Cache-Age', Math.floor(age / 1000).toString());
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }
    
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No cached data available',
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch fresh content in background
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', new Date().toISOString());
      
      const responseWithHeaders = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, responseWithHeaders);
    }
    return networkResponse;
  }).catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Check if cache is stale
    const cachedDate = new Date(cachedResponse.headers.get('sw-cache-date') || 0);
    const isStale = Date.now() - cachedDate.getTime() > maxAge;
    
    if (!isStale) {
      return cachedResponse;
    }
  }
  
  // Wait for network if no cache or cache is stale
  return fetchPromise || cachedResponse || new Response('Content not available', { status: 503 });
}

// Cache cleanup utility
async function cleanupCaches() {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const cachedDate = new Date(response.headers.get('sw-cache-date') || 0);
        const age = Date.now() - cachedDate.getTime();
        
        // Remove entries older than 7 days
        if (age > 7 * 24 * 60 * 60 * 1000) {
          await cache.delete(request);
        }
      }
    }
  }
}

// Background sync for enhanced offline support
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Enhanced offline data sync
async function syncOfflineData() {
  try {
    console.log('🔄 Starting enhanced offline data sync...');
    
    // Implement actual sync logic here
    // This would connect to your offline storage service
    
    console.log('✅ Enhanced offline data sync completed');
  } catch (error) {
    console.log('❌ Enhanced offline data sync failed:', error);
  }
}

// Performance monitoring
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }
  
  return stats;
}