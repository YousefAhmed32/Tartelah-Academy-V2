import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  // Pure-logic unit tests only (no jsdom/testing-library) — see
  // src/utils/__tests__/assignmentSchedule.test.js. No frontend component/DOM
  // test infra exists in this repo; keeping this addition minimal and scoped
  // to what the Phase 2 Part 2 UX redesign's testing requirements actually need.
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
