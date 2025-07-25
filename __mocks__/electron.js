module.exports = {
  app: {
    getPath: jest.fn((name) => `/mock/path/${name}`),
    getName: jest.fn(() => 'assembly-notes'),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    quit: jest.fn(),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeHandler: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
    },
  })),
  dialog: {
    showErrorBox: jest.fn(),
    showMessageBox: jest.fn(),
  },
};
