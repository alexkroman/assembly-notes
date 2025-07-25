module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main/main.js',
    '!src/preload/preload.js',
    '!src/renderer/renderer.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^electron$': '<rootDir>/__mocks__/electron.js',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
