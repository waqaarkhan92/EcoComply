const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // Exclude Playwright E2E tests (they should run via 'npx playwright test')
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/e2e/',
    '/e2e/',
  ],
  // Default to node environment, override in individual test files for frontend
  testEnvironment: 'node',
  // Override for frontend tests using testEnvironment in test file or via testEnvironmentOptions
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(undici)/)',
  ],
  // Detect open handles only when debugging (use npm run test:debug)
  // For normal runs, use --forceExit to prevent hanging
  detectOpenHandles: false,
  forceExit: false, // Controlled by CLI flag
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
