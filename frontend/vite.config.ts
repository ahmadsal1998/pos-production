import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
    plugins: [react()],
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
