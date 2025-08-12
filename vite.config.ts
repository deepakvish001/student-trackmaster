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
      devOptions: {
        enabled: true, // Enable PWA in development
        type: 'module'
      },
      workbox: {
        // Critical: Ensure offline navigation works perfectly
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          // Exclude API calls, assets with extensions, and internal paths
          /^\/api\//, 
          /^\/_/,
          /\/[^/?]+\.[^/]+$/,
          /^\/.*\.(js|css|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/
        ],
        
        // Precache all essential app files for offline access
        globPatterns: [
          '**/*.{js,css,html,ico,png,jpg,jpeg,svg,gif,webp,woff,woff2,ttf,eot}',
          'manifest.json',
          'mfs100-*.js' // Include MFS100 SDK
        ],
        
        // Include critical routes and manifest
        additionalManifestEntries: [
          { url: '/', revision: Date.now().toString() },
          { url: '/index.html', revision: Date.now().toString() },
          { url: '/manifest.json', revision: Date.now().toString() },
          { url: '/dashboard', revision: Date.now().toString() },
          { url: '/students', revision: Date.now().toString() },
          { url: '/batches', revision: Date.now().toString() },
          { url: '/login', revision: Date.now().toString() }
        ],
        
        // Increased cache size for comprehensive offline support
        maximumFileSizeToCacheInBytes: 15000000, // 15MB
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        
        // Enhanced runtime caching for complete offline functionality
        runtimeCaching: [
          // Document/Navigation requests - Network first with fast fallback
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
              networkTimeoutSeconds: 2, // Quick fallback to cache
            },
          },
            // App shell assets - Cache first for instant loading
            {
              urlPattern: /\.(?:js|css|html)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-shell-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            
            // Static assets - Cache first with long expiration
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
                },
              },
            },
            
            // API calls - Network first with offline fallback
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            
            // Auth calls - Network only (don't cache sensitive data)
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
              handler: 'NetworkOnly',
            },
            
            // External resources - Stale while revalidate
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            
            // Font files - Cache first
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
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
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
