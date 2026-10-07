import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/clients/**/*.ts',
        'src/schemas/**/*.ts',
        'src/server/toolRegistry.ts',
        'src/tools/**/*.ts',
        'src/utils/adf.ts',
        'src/utils/config.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        statements: 80,
        branches: 60,
        functions: 80,
        lines: 80,
      },
    },
  },
});
