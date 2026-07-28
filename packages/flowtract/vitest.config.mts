import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/flowtract/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/flowtract/src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'packages/flowtract/coverage',
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 85
      }
    }
  }
});
