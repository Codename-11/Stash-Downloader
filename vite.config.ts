import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { corsProxyPlugin } from './vite-plugins/cors-proxy-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isTestMode = mode === 'test' || process.env.VITE_TEST === 'true';

  return {
    plugins: [
      react(),
      // Auto-start CORS proxy in test mode
      ...(isTestMode ? [corsProxyPlugin()] : []),
    ],

    // Define global constants for browser builds
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': JSON.stringify({}),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/services': path.resolve(__dirname, './src/services'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/constants': path.resolve(__dirname, './src/constants'),
      },
    },

    // Only use build config when not in test mode
    build: isTestMode
      ? {
          // Standard app build for testing
          outDir: 'dist-test',
          sourcemap: true,
          // Ensure console logs are preserved in test builds
          minify: false, // Don't minify in test mode to preserve all logs
        }
      : {
          // Library build for Stash plugin
          lib: {
            entry: path.resolve(__dirname, 'src/index.tsx'),
            name: 'StashDownloaderPlugin',
            fileName: () => 'stash-downloader.js',
            formats: ['iife'],
          },
          rollupOptions: {
            // Externalize deps that are provided by Stash
            external: [
              'react',
              'react-dom',
              'react-dom/client',
              'react-router-dom',
              '@apollo/client',
              'react-intl',
            ],
            output: {
              // Global variable names for externalized deps
              globals: {
                react: 'PluginApi.React',
                'react-dom': 'PluginApi.ReactDOM',
                'react-dom/client': 'PluginApi.ReactDOM',
                'react-router-dom': 'PluginApi.libraries.ReactRouterDOM',
                '@apollo/client': 'PluginApi.libraries.Apollo',
                'react-intl': 'PluginApi.libraries.Intl',
              },
              // Ensure consistent output
              inlineDynamicImports: true,
            },
          },
          outDir: 'dist',
          emptyOutDir: true,
          sourcemap: false, // Disable in production
          minify: 'terser',
          terserOptions: {
            compress: {
              drop_console: false, // Keep console logs even in production
              drop_debugger: true,
            },
          },
          target: 'es2020',
        },

    // Development server config (for testing outside Stash)
    server: {
      port: 3000,
      open: isTestMode,
    },

    // Root for test mode - points to test-app directory
    root: isTestMode ? path.resolve(__dirname, 'test-app') : undefined,
  };
});
