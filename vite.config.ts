import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],

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

    // Library build for Stash plugin
    build: {
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
        ],
        output: {
          // Global variable names for externalized deps
          globals: {
            react: 'PluginApi.React',
            'react-dom': 'PluginApi.ReactDOM',
            'react-dom/client': 'PluginApi.ReactDOM',
            'react-router-dom': 'PluginApi.libraries.ReactRouterDOM',
            '@apollo/client': 'PluginApi.libraries.Apollo',
          },
          // Ensure consistent output
          inlineDynamicImports: true,
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: true,
        },
      },
      target: 'es2020',
    },

    // Development server config
    server: {
      port: 3000,
    },
  };
});
