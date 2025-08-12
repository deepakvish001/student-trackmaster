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
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10000000, // 10MB for better caching
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
