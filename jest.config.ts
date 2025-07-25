export default {
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main/main.ts',
    '!src/preload/preload.ts',
    '!src/renderer/renderer.ts',
    '!src/renderer/media.ts',
    '!src/renderer/ui.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^electron$': '<rootDir>/__mocks__/electron',
    '^(.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
        diagnostics: {
          ignoreCodes: [2345, 2322, 2740, 2739, 2717, 2403],
        },
      },
    ],
  },
};
