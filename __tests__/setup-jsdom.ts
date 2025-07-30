import '@testing-library/jest-dom';

// Mock electron APIs for renderer tests
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      invoke: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    },
  },
});
