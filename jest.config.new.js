const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/tests/**/*.test.ts?(x)',
    '**/tests/**/*.spec.ts?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/e2e/', // E2E tests run separately with Playwright
  ],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/scripts/**', // Exclude build/utility scripts
  ],
  // Coverage thresholds for 100% coverage
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/api/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './components/**/*.tsx': {
      branches: 90, // Slightly relaxed for UI components
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  transformIgnorePatterns: [
    'node_modules/(?!(undici)/)',
  ],
  detectOpenHandles: false,
  forceExit: true,
  maxWorkers: '50%', // Use half of available CPUs for faster tests
};

module.exports = createJestConfig(customJestConfig);
