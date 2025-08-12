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
  build: {
    // Target modern browsers to avoid unnecessary polyfills
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    // Enable modern JS features without polyfills
    modulePreload: {
      polyfill: false
    },
    // More aggressive minification for modern browsers
    minify: 'esbuild',
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching and tree shaking
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip', '@radix-ui/react-select'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers'],
          'query-vendor': ['@tanstack/react-query'],
          'router-vendor': ['react-router-dom'],
          'chart-vendor': ['recharts'],
          'table-vendor': ['@tanstack/react-table']
        },
        // Modern ES module format
        format: 'es',
        // Use modern syntax in output
        generatedCode: {
          constBindings: true,
          objectShorthand: true,
          reservedNamesAsProps: false,
          symbols: true
        }
      }
    },
    // Reduce bundle size
    cssCodeSplit: true,
    // Modern sourcemap for production
    sourcemap: mode === 'development'
  },
  // Configure esbuild for modern syntax with explicit feature support
  esbuild: {
    target: 'es2020',
    // Explicitly keep modern syntax
    keepNames: true,
    // Remove development code in production
    drop: mode === 'production' ? ['console', 'debugger'] : undefined,
    // Force modern output without legacy transforms
    format: 'esm',
    // Platform-specific optimizations
    platform: 'browser',
    // Ensure modern features are preserved
    tsconfigRaw: {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable']
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10000000, // 10MB for better caching
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          // Static JS/CSS assets - Long-term caching to fix SEO cache issue
          {
            urlPattern: /\/assets\/.*\.(js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-v3',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year cache for hashed assets
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Vendor chunks - Long-term caching
          {
            urlPattern: /\/assets\/.*vendor.*\.(js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vendor-assets-v3',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // App scripts like mfs100 and registerSW
          {
            urlPattern: /\/(mfs100-.*\.js|registerSW\.js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-scripts-v3',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
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
          // Images - Optimized caching
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-optimized-v3',
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
              cacheName: 'google-fonts-stylesheets-v3',
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
              cacheName: 'google-fonts-webfonts-v3',
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
