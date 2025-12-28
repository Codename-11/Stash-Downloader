import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version;

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],

    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env': JSON.stringify({}),
      __APP_VERSION__: JSON.stringify(appVersion),
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
        '@stash-plugins/shared': path.resolve(__dirname, '../../shared'),
      },
    },

    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.tsx'),
        name: 'StashBrowserPlugin',
        fileName: () => 'stash-browser.js',
        formats: ['iife'],
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react-dom/client',
          'react-router-dom',
          '@apollo/client',
        ],
        output: {
          globals: {
            react: 'PluginApi.React',
            'react-dom': 'PluginApi.ReactDOM',
            'react-dom/client': 'PluginApi.ReactDOM',
            'react-router-dom': 'PluginApi.libraries.ReactRouterDOM',
            '@apollo/client': 'PluginApi.libraries.Apollo',
          },
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

    server: {
      port: 3001,
    },
  };
});
