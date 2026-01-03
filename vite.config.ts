/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    // Reduce console output
    silent: false,
    reporter: ['basic'],
    // Faster test execution
    testTimeout: 8000, // Reduced from 15000ms default
    hookTimeout: 5000,
    // Optimize file watching
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/cdk/**'],
  },
})