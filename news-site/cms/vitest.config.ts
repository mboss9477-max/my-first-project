import { randomBytes } from 'crypto'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.int.spec.ts'],
    // Payload boots once per file and pushes the schema to SQLite; give it time.
    hookTimeout: 120_000,
    testTimeout: 30_000,
    env: {
      // Throwaway values generated per run; nothing secret is committed.
      PAYLOAD_SECRET: randomBytes(32).toString('hex'),
      DATABASE_URL: 'file:./cms-test.db',
    },
  },
})
