import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { SlackOAuthService } from '../../../src/main/services/slackOAuthService';
import {
  createMockSettings,
  createMockInstallation,
} from '../../utils/testHelpers.js';

// Mock electron
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  app: {
    getPath: jest.fn(() => '/mock/app/path'),
  },
}));

// Mock Node.js http module
const mockServerInstance = {
  listen: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
};

jest.mock('http', () => ({
  createServer: jest.fn(() => mockServerInstance),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockDatabase = {
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
};

const mockMainWindow = {
  webContents: {
    send: jest.fn(),
  },
};

const mockSettingsService = {
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
};

describe('SlackOAuthService', () => {
  let slackOAuthService: SlackOAuthService;
  let mockBrowserWindow: any;
  let originalClientId: string | undefined;
  let originalClientSecret: string | undefined;

  beforeAll(() => {
    // Store original values
    originalClientId = process.env['SLACK_CLIENT_ID'];
    originalClientSecret = process.env['SLACK_CLIENT_SECRET'];

    // Set valid test credentials
    process.env['SLACK_CLIENT_ID'] = 'test-client-id';
    process.env['SLACK_CLIENT_SECRET'] = 'test-client-secret';
  });

  afterAll(() => {
    // Restore original values
    if (originalClientId !== undefined) {
      process.env['SLACK_CLIENT_ID'] = originalClientId;
    } else {
      delete process.env['SLACK_CLIENT_ID'];
    }
    if (originalClientSecret !== undefined) {
      process.env['SLACK_CLIENT_SECRET'] = originalClientSecret;
    } else {
      delete process.env['SLACK_CLIENT_SECRET'];
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockFetch.mockReset();

    // Reset server mocks
    mockServerInstance.listen.mockClear();
    mockServerInstance.close.mockClear();
    mockServerInstance.on.mockClear();

    // Setup server listen mock to call callback immediately
    mockServerInstance.listen.mockImplementation((_port, _host, callback) => {
      if (callback) callback();
    });

    // Setup mock BrowserWindow FIRST
    mockBrowserWindow = {
      loadURL: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      webContents: {
        on: jest.fn(),
        send: jest.fn(),
      },
      close: jest.fn(),
      destroy: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      show: jest.fn(),
      focus: jest.fn(),
      center: jest.fn(),
    };

    // Reset container
    container.clearInstances();

    // Register mock dependencies
    container.registerInstance(DI_TOKENS.Logger, mockLogger);
    container.registerInstance(DI_TOKENS.DatabaseService, mockDatabase as any);
    container.registerInstance(DI_TOKENS.MainWindow, mockMainWindow as any);

    // Force module reload to pick up environment variables
    jest.resetModules();

    // Re-mock electron after module reset with the configured mockBrowserWindow
    jest.doMock('electron', () => ({
      BrowserWindow: jest.fn().mockImplementation(() => mockBrowserWindow),
      app: {
        getPath: jest.fn(() => '/mock/app/path'),
      },
    }));

    const { SlackOAuthService } = await import(
      '../../../src/main/services/slackOAuthService'
    );

    slackOAuthService = new SlackOAuthService(
      mockDatabase as any,
      mockLogger as any,
      mockMainWindow as any,
      mockSettingsService as any
    );
  });

  describe('initiateOAuth', () => {
    it('should create HTTP server, OAuth window and load authorization URL', async () => {
      const { createServer } = await import('http');

      await slackOAuthService.initiateOAuth();

      // Verify HTTP server was created and started
      expect(createServer).toHaveBeenCalledWith(expect.any(Function));
      expect(mockServerInstance.listen).toHaveBeenCalledWith(
        3000,
        'localhost',
        expect.any(Function)
      );

      // Get the mocked BrowserWindow constructor from the imported module
      const { BrowserWindow: MockedBrowserWindow } = await import('electron');

      expect(MockedBrowserWindow).toHaveBeenCalledWith({
        width: 800,
        height: 700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
          allowRunningInsecureContent: true,
          experimentalFeatures: true,
        },
        parent: mockMainWindow,
        modal: false,
        show: false,
        title: 'Connect to Slack - Assembly Notes',
        autoHideMenuBar: true,
        alwaysOnTop: true,
        resizable: true,
        minimizable: false,
        maximizable: false,
      });

      // Verify the authorization URL includes the new redirect URI
      expect(mockBrowserWindow.loadURL).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/oauth/v2/authorize')
      );
      expect(mockBrowserWindow.loadURL).toHaveBeenCalledWith(
        expect.stringContaining(
          'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fslack%2Fcallback'
        )
      );
      expect(mockBrowserWindow.loadURL).toHaveBeenCalledWith(
        expect.stringContaining(
          'scope=channels:read,groups:read,im:read,im:write,mpim:read,mpim:write,chat:write,chat:write.public,users:read'
        )
      );

      expect(mockBrowserWindow.on).toHaveBeenCalledWith(
        'closed',
        expect.any(Function)
      );
    });

    it('should stop server when OAuth window is closed', async () => {
      await slackOAuthService.initiateOAuth();

      // Simulate window closed event
      const closeHandler = mockBrowserWindow.on.mock.calls.find(
        (call: any) => call[0] === 'closed'
      )[1];

      closeHandler();

      // Verify server was stopped
      expect(mockServerInstance.close).toHaveBeenCalled();
    });

    it('should handle server startup failure', async () => {
      // Mock server listen to call error callback instead
      mockServerInstance.listen.mockImplementation(() => {
        // Simulate server error
        const errorHandler = mockServerInstance.on.mock.calls.find(
          (call: any) => call[0] === 'error'
        )?.[1];
        if (errorHandler) {
          errorHandler(new Error('Port already in use'));
        }
      });

      mockServerInstance.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          // Call error handler immediately with mock error
          setTimeout(() => handler(new Error('Port already in use')), 0);
        }
      });

      await expect(slackOAuthService.initiateOAuth()).rejects.toThrow(
        'Port already in use'
      );
    });

    it('should handle OAuth window creation failure', async () => {
      // Force module reload to pick up the new mock
      jest.resetModules();

      // Mock BrowserWindow to throw on creation
      jest.doMock('electron', () => ({
        BrowserWindow: jest.fn().mockImplementation(() => {
          throw new Error('Window creation failed');
        }),
        app: {
          getPath: jest.fn(() => '/mock/app/path'),
        },
      }));

      const { SlackOAuthService } = await import(
        '../../../src/main/services/slackOAuthService'
      );

      const testService = new SlackOAuthService(
        mockDatabase as any,
        mockLogger as any,
        mockMainWindow as any,
        mockSettingsService as any
      );

      await expect(testService.initiateOAuth()).rejects.toThrow(
        'Window creation failed'
      );
    });

    it('should handle missing OAuth credentials gracefully', async () => {
      // Temporarily set to placeholder values
      process.env['SLACK_CLIENT_ID'] = 'YOUR_SLACK_CLIENT_ID_HERE';
      process.env['SLACK_CLIENT_SECRET'] = 'YOUR_SLACK_CLIENT_SECRET_HERE';

      // Force module to re-evaluate constants
      jest.resetModules();
      const { SlackOAuthService: TestSlackOAuthService } = await import(
        '../../../src/main/services/slackOAuthService'
      );

      const testService = new TestSlackOAuthService(
        mockDatabase as any,
        mockLogger as any,
        mockMainWindow as any,
        mockSettingsService as any
      );

      await testService.initiateOAuth();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth configuration missing:',
        expect.stringContaining('Slack OAuth is not configured')
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-error',
        'Slack integration is not configured in this build.'
      );

      // Restore test values
      process.env['SLACK_CLIENT_ID'] = 'test-client-id';
      process.env['SLACK_CLIENT_SECRET'] = 'test-client-secret';
    });
  });

  describe('OAuth callback handling', () => {
    let requestHandler: any;

    beforeEach(async () => {
      const mockSettings = createMockSettings({
        slackInstallations: [], // Start with empty installations
      });

      // Mock database to return empty initially, then updated after saveInstallation
      mockDatabase.getSettings.mockReturnValue(mockSettings);

      // Mock updateSettings to actually update the mock data for subsequent calls
      mockDatabase.updateSettings.mockImplementation((updates: any) => {
        if (updates.slackInstallations) {
          mockSettings.slackInstallations = updates.slackInstallations;
        }
        if (updates.selectedSlackInstallation) {
          mockSettings.selectedSlackInstallation =
            updates.selectedSlackInstallation;
        }
        if (updates.availableChannels) {
          mockSettings.availableChannels = updates.availableChannels;
        }
      });

      // Get the request handler from createServer mock
      const { createServer } = await import('http');
      await slackOAuthService.initiateOAuth();

      const createServerCall = (createServer as jest.Mock).mock.calls[0];
      requestHandler = createServerCall[0]; // The request handler function
    });

    it('should handle successful OAuth callback via HTTP server', async () => {
      const mockOAuthResponse = {
        ok: true,
        access_token: 'xoxb-test-token',
        team: {
          id: 'T123456',
          name: 'Test Team',
        },
        bot_user_id: 'U123456',
        scope: 'chat:write,channels:read',
      };

      const mockChannelsResponse = {
        ok: true,
        channels: [],
      };

      // Setup fetch mock to respond to multiple calls in sequence
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockOAuthResponse),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockChannelsResponse),
        } as any);

      // Create mock request and response objects
      const mockReq = {
        url: '/auth/slack/callback?code=test-code',
      };

      const mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
      };

      // Simulate HTTP request to callback endpoint
      await requestHandler(mockReq, mockRes);

      // Verify success HTML response was sent
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/html',
      });
      expect(mockRes.end).toHaveBeenCalledWith(
        expect.stringContaining('Successfully connected to Slack')
      );

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify OAuth token exchange was called
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://slack.com/api/oauth.v2.access',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(URLSearchParams),
        }
      );

      // Verify fetch was only called once (for OAuth exchange)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify installation was saved (first call)
      expect(mockSettingsService.updateSettings).toHaveBeenNthCalledWith(1, {
        slackInstallations: [
          {
            teamId: 'T123456',
            teamName: 'Test Team',
            botToken: 'xoxb-test-token',
            botUserId: 'U123456',
            scope: 'chat:write,channels:read',
            installedAt: expect.any(Number),
          },
        ],
        selectedSlackInstallation: 'T123456',
      });

      // Verify success event was sent
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-success',
        expect.any(Object)
      );
    });

    it('should handle OAuth error response', async () => {
      const mockErrorResponse = {
        ok: false,
        error: 'invalid_code',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const mockReq = {
        url: '/auth/slack/callback?code=test-code',
      };

      const mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
      };

      await requestHandler(mockReq, mockRes);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-error',
        'Failed to complete OAuth flow'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth callback error:',
        expect.any(Error)
      );
    });

    it('should handle network errors during OAuth', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockReq = {
        url: '/auth/slack/callback?code=test-code',
      };

      const mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
      };

      await requestHandler(mockReq, mockRes);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-error',
        'Failed to complete OAuth flow'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth callback error:',
        expect.any(Error)
      );
    });

    it('should handle OAuth denial', async () => {
      const mockReq = {
        url: '/auth/slack/callback?error=access_denied',
      };

      const mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
      };

      await requestHandler(mockReq, mockRes);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-error',
        'access_denied'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth error:',
        'access_denied'
      );
    });

    it('should handle 404 for non-callback paths', async () => {
      const mockReq = {
        url: '/some/other/path',
      };

      const mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
      };

      await requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(404, {
        'Content-Type': 'text/plain',
      });
      expect(mockRes.end).toHaveBeenCalledWith('Not Found');
    });
  });

  describe('removeInstallation', () => {
    beforeEach(() => {
      const installations = [
        createMockInstallation({ botToken: 'xoxb-test-token' }),
        createMockInstallation({
          teamId: 'T789012',
          teamName: 'Another Team',
          botToken: 'xoxb-another-token',
          botUserId: 'U789012',
          scope: 'chat:write',
        }),
      ];

      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          slackInstallations: installations,
          selectedSlackInstallation: 'T123456',
          availableChannels: [
            { id: 'C123', name: 'general', isPrivate: false },
          ],
        })
      );
    });

    it('should remove an installation and update selection', async () => {
      await slackOAuthService.removeInstallation('T123456');

      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        slackInstallations: [
          {
            teamId: 'T789012',
            teamName: 'Another Team',
            botToken: 'xoxb-another-token',
            botUserId: 'U789012',
            scope: 'chat:write',
            installedAt: expect.any(Number),
          },
        ],
        selectedSlackInstallation: 'T789012',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Removed Slack installation for team: T123456'
      );
    });

    it('should clear selection when removing last installation', async () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          slackInstallations: [
            createMockInstallation({
              botToken: 'xoxb-test-token',
              scope: 'chat:write',
            }),
          ],
          selectedSlackInstallation: 'T123456',
        })
      );

      await slackOAuthService.removeInstallation('T123456');

      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        slackInstallations: [],
        selectedSlackInstallation: '',
      });
    });

    it('should handle removing non-existent installation', async () => {
      await slackOAuthService.removeInstallation('T999999');

      // Should still update settings (no-op, but logs the attempt)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Removed Slack installation for team: T999999'
      );
    });
  });

  describe('getCurrentInstallation', () => {
    it('should return current installation', async () => {
      const installation = createMockInstallation({
        botToken: 'xoxb-test-token',
        scope: 'chat:write',
      });

      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          slackInstallations: [installation],
          selectedSlackInstallation: 'T123456',
        })
      );

      const result = await slackOAuthService.getCurrentInstallation();

      expect(result).toEqual(installation);
    });

    it('should return null when no installation selected', async () => {
      mockDatabase.getSettings.mockReturnValue(createMockSettings());

      const result = await slackOAuthService.getCurrentInstallation();

      expect(result).toBeNull();
    });

    it('should return null when selected installation not found', async () => {
      mockDatabase.getSettings.mockReturnValue(
        createMockSettings({
          selectedSlackInstallation: 'T999999',
          slackInstallations: [],
        })
      );

      const result = await slackOAuthService.getCurrentInstallation();

      expect(result).toBeNull();
    });
  });

  describe('window cleanup', () => {
    it('should handle multiple OAuth attempts', async () => {
      // Get the mocked BrowserWindow constructor
      const { BrowserWindow: MockedBrowserWindow } = await import('electron');

      // First OAuth attempt
      await slackOAuthService.initiateOAuth();
      expect(MockedBrowserWindow).toHaveBeenCalledTimes(1);

      // Second OAuth attempt should focus existing window, not create new one
      await slackOAuthService.initiateOAuth();
      expect(MockedBrowserWindow).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(mockBrowserWindow.focus).toHaveBeenCalled();
    });
  });
});
