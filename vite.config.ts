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
          'chart-vendor': ['recharts']
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
        // Critical: Ensure offline navigation works
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        
        // Precache all essential app files for offline access
        globPatterns: [
          '**/*.{js,css,html,ico,png,jpg,jpeg,svg,gif,webp,woff,woff2,ttf,eot}',
          'manifest.json'
        ],
        
        // Include specific files that must be cached
        additionalManifestEntries: [
          { url: '/', revision: Date.now().toString() },
          { url: '/index.html', revision: Date.now().toString() },
          { url: '/manifest.json', revision: Date.now().toString() }
        ],
        
        maximumFileSizeToCacheInBytes: 10000000,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
          
          // Enhanced runtime caching for complete offline support
          runtimeCaching: [
            // Document requests - Critical for offline navigation
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60,
                },
                networkTimeoutSeconds: 3,
              },
            },
            // App shell assets - Cache first for instant loading
            {
              urlPattern: /\.(?:js|css|html)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-shell',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            },
            // Images - Cache first with long expiration
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            // Fonts - Cache first with very long expiration
            {
              urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
              },
            },
            // API Routes - Network first with offline fallback
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
                networkTimeoutSeconds: 3,
              },
            },
            // Auth requests - Network first with short cache
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'auth-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 5,
              },
            },
            // Navigation requests - Network first with offline fallback
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'navigation-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
                networkTimeoutSeconds: 3,
              },
            },
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
            src: '/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: '/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png',
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
