/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fast test configuration for quick feedback
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Aggressive performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 6,
        minThreads: 2,
      },
    },
    // Minimal console output
    silent: true,
    reporter: ['basic'],
    // Very fast execution
    testTimeout: 3000,
    hookTimeout: 2000,
    // Skip slow tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cdk/**',
      '**/*.property.test.*', // Skip property-based tests for speed
      '**/EndToEnd.*.test.*', // Skip end-to-end tests for speed
    ],
    // Optimize file watching
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/cdk/**'],
  },
})