
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10000000, // 10MB for better caching
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          // Supabase API - Ultra-fast network first
          {
            urlPattern: /^https:\/\/zwtjjzryscwhqsgvvqzf\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-ultra-cache',
              networkTimeoutSeconds: 2, // Faster timeout
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 200, // More cache entries
                maxAgeSeconds: 60 * 60 * 2 // 2 hours for faster updates
              },
              plugins: [{
                cacheKeyWillBeUsed: async ({ request }) => {
                  // Add timestamp to force fresh data for critical operations
                  const url = new URL(request.url);
                  if (url.pathname.includes('dashboard') || url.pathname.includes('students')) {
                    url.searchParams.set('_t', Math.floor(Date.now() / 60000).toString()); // 1 minute cache
                  }
                  return url.toString();
                }
              }]
            }
          },
          // Static assets - Ultra-fast cache first
          {
            urlPattern: /\.(?:js|css|html)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources-v2',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          },
          // Images - Optimized caching
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-optimized-v2',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              plugins: [{
                cacheWillUpdate: async ({ response }) => {
                  return response.status === 200 ? response : null;
                }
              }]
            }
          },
          // Fonts - Long-term caching
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets-v2',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts-v2',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      manifest: {
        name: 'BiometricHub - Student Management',
        short_name: 'BiometricHub',
        description: 'Ultra-fast biometric student management system with real-time capabilities',
        theme_color: '#FF6B35',
        background_color: '#0F0F0F',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/?source=pwa',
        categories: ['education', 'productivity', 'utilities'],
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          },
          {
            src: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: '/public/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
