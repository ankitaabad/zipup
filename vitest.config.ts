import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',

    // Test file patterns
    include: ['__test__/**/*.test.ts'],
  },
})
