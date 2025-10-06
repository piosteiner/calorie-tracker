/**
 * Jest Configuration for Calories Tracker
 * Configured for ES6 modules and browser environment
 */

export default {
  // Test environment - use jsdom to simulate browser
  testEnvironment: 'jsdom',
  
  // Transform ES6 modules
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'modules/**/*.js',
    '!modules/**/*.test.js',
    '!**/node_modules/**',
  ],
  
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/backend/',
    '/backend_backup.*/',
  ],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Maximum workers
  maxWorkers: '50%',
};
