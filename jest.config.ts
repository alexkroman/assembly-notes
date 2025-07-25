export default {
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',
  testMatch: ['**/__tests__/**/*.test.ts', '!**/__tests__/disabled/**'],
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
    '^electron-log$': '<rootDir>/__mocks__/electron-log',
    '^assemblyai$': '<rootDir>/__mocks__/assemblyai',
    '^electron-updater$': '<rootDir>/__mocks__/electron-updater',
    '^electron-store$': '<rootDir>/__mocks__/electron-store',
    '^../src/main/logger$': '<rootDir>/__mocks__/logger',
    '^../src/main/settings$': '<rootDir>/__mocks__/settings',
    '^\\./settings\\.js$': '<rootDir>/__mocks__/settings',
    '^\\./logger\\.js$': '<rootDir>/__mocks__/logger',
    '^(.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        diagnostics: {
          ignoreCodes: [2345, 2322, 2740, 2739, 2717, 2403],
        },
        tsconfig: {
          sourceMap: false,
        },
      },
    ],
  },
};
