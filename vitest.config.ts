/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: [
      // Handle @/storage specifically for src files
      { find: /^@\/storage(.*)$/, replacement: path.resolve(__dirname, 'src/storage$1') },
      // Handle @/src paths
      { find: /^@\/src(.*)$/, replacement: path.resolve(__dirname, 'src$1') },
      // Handle @/lib paths
      { find: /^@\/lib(.*)$/, replacement: path.resolve(__dirname, 'lib$1') },
      // Handle @/types paths
      { find: /^@\/types(.*)$/, replacement: path.resolve(__dirname, 'types$1') },
      // Default @ to root (for types, lib, etc. that exist at root)
      { find: '@', replacement: path.resolve(__dirname, '.') },
    ],
  },
});
