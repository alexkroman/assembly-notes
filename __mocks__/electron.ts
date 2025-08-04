export const app = {
  isPackaged: false,
  getPath: jest.fn().mockReturnValue('/mock/path'),
  getName: jest.fn().mockReturnValue('assembly-notes'),
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  quit: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  whenReady: jest.fn().mockResolvedValue(true),
};

export const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadURL: jest.fn(),
  loadFile: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  webContents: {
    send: jest.fn(),
    on: jest.fn(),
    openDevTools: jest.fn(),
  },
  show: jest.fn(),
  close: jest.fn(),
  destroy: jest.fn(),
  isDestroyed: jest.fn().mockReturnValue(false),
}));

export const ipcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeHandler: jest.fn(),
  removeAllListeners: jest.fn(),
};

export const dialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
  showErrorBox: jest.fn(),
};

export const shell = {
  openExternal: jest.fn(),
};

export const autoUpdater = {
  setFeedURL: jest.fn(),
  checkForUpdates: jest.fn(),
  checkForUpdatesAndNotify: jest.fn(),
  downloadUpdate: jest.fn(),
  quitAndInstall: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

export const Menu = {
  buildFromTemplate: jest.fn().mockReturnValue({}),
  setApplicationMenu: jest.fn(),
};

export const nativeTheme = {
  shouldUseDarkColors: false,
  themeSource: 'system' as const,
  on: jest.fn(),
};

export default {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  autoUpdater,
  Menu,
  nativeTheme,
};
