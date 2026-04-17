import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/renderer/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
})
