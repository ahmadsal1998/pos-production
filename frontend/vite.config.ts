import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt', // Show prompt when new content available; allows custom install prompt
        injectRegister: 'auto',
        includeAssets: ['icons/*.png'],
        manifest: {
          name: 'POS Point Hub - نقطة البيع',
          short_name: 'POS Hub',
          description: 'Point of Sale system - install and use like a native app',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#f97316',
          background_color: '#0f172a',
          categories: ['business', 'productivity'],
          icons: [
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          prefer_related_applications: false,
        },
        workbox: {
          // Cache First for precached static assets (default)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Don't use navigate fallback for API routes - use Network First below
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/[^/]*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
        devOptions: { enabled: true },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/shared': path.resolve(__dirname, 'src/shared'),
        '@/features': path.resolve(__dirname, 'src/features'),
        '@/lib': path.resolve(__dirname, 'src/lib'),
        '@/app': path.resolve(__dirname, 'src/app'),
        '@/pages': path.resolve(__dirname, 'src/pages'),
      },
    },
    build: {
      // Optimize build for memory efficiency
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manual chunk splitting to reduce memory pressure during build
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@headlessui/react'],
            'utils-vendor': ['axios', 'zustand'],
          },
        },
      },
      // Reduce memory usage during minification
      minify: 'esbuild', // esbuild is faster and uses less memory than terser
      // Limit sourcemap generation in production to save memory
      sourcemap: mode === 'development',
    },
  };
});
