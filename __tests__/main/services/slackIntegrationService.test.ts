import 'reflect-metadata';
import { Store } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import {
  SlackIntegrationService,
  IHttpClient,
} from '../../../src/main/services/slackIntegrationService';
import { SlackInstallation } from '../../../src/types/common';
import { resetTestContainer } from '../../test-helpers/container-setup';

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn().mockReturnValue('/mock/path'),
    getName: jest.fn().mockReturnValue('assembly-notes'),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
  },
  BrowserWindow: jest.fn().mockImplementation(() => {
    const mockWindow = {
      focus: jest.fn(),
      show: jest.fn(),
      center: jest.fn(),
      close: jest.fn(),
      loadURL: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      webContents: {
        on: jest.fn(),
        send: jest.fn(),
      },
    };
    return mockWindow;
  }),
}));

jest.mock('electron-log', () => {
  const mockLog = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    transports: {
      file: {
        level: 'info',
        format: '',
        resolvePathFn: jest.fn(),
      },
      console: {
        level: 'debug',
        format: '',
      },
    },
    hooks: [],
    errorHandler: {
      startCatching: jest.fn(),
    },
  };
  return {
    ...mockLog,
    default: mockLog,
  };
});

// Mock fetch globally
global.fetch = jest.fn();

const createDefaultState = (overrides = {}) => ({
  settings: {
    slackInstallation: null,
    slackChannels: '',
    ...overrides,
  },
});

const mockStore = {
  getState: jest.fn(() => createDefaultState()),
  dispatch: jest.fn(),
  subscribe: jest.fn(() => jest.fn()),
} as any;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockMainWindow = {
  webContents: { send: jest.fn() },
} as unknown as BrowserWindow;

const mockSettingsService = {
  updateSettings: jest.fn(),
} as any;

const mockHttpClient: IHttpClient = {
  post: jest.fn(),
};

describe('SlackIntegrationService', () => {
  let slackService: SlackIntegrationService;

  beforeEach(() => {
    resetTestContainer();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    mockStore.getState.mockReturnValue(createDefaultState());

    container.register(DI_TOKENS.Store, {
      useValue: mockStore as unknown as Store,
    });
    container.register(DI_TOKENS.Logger, { useValue: mockLogger });
    container.register(DI_TOKENS.MainWindow, { useValue: mockMainWindow });
    container.register(DI_TOKENS.SettingsService, {
      useValue: mockSettingsService,
    });
    container.register(DI_TOKENS.HttpClient, { useValue: mockHttpClient });

    slackService = container.resolve(SlackIntegrationService);
  });

  afterEach(() => {
    resetTestContainer();
  });

  describe('initiateOAuth', () => {
    it('should create OAuth window and load auth URL', async () => {
      const mockOAuthWindow = {
        focus: jest.fn(),
        show: jest.fn(),
        center: jest.fn(),
        loadURL: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
          send: jest.fn(),
        },
      };

      (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
        () => mockOAuthWindow
      );

      await slackService.initiateOAuth();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 800,
          height: 700,
          title: 'Connect to Slack - Assembly-Notes',
        })
      );
      expect(mockOAuthWindow.show).toHaveBeenCalled();
      expect(mockOAuthWindow.focus).toHaveBeenCalled();
      expect(mockOAuthWindow.center).toHaveBeenCalled();
      expect(mockOAuthWindow.loadURL).toHaveBeenCalledWith(
        expect.stringContaining('https://slack.com/oauth/v2/authorize')
      );
    });

    it('should focus existing OAuth window if already open', async () => {
      const mockOAuthWindow = {
        focus: jest.fn(),
        show: jest.fn(),
        center: jest.fn(),
        loadURL: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
          send: jest.fn(),
        },
      };

      (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
        () => mockOAuthWindow
      );

      await slackService.initiateOAuth();
      await slackService.initiateOAuth(); // Call again

      expect(BrowserWindow).toHaveBeenCalledTimes(1); // Only created once
      expect(mockOAuthWindow.focus).toHaveBeenCalledTimes(2); // Focused twice
    });

    it('should handle OAuth callback with code', async () => {
      const mockOAuthWindow = {
        focus: jest.fn(),
        show: jest.fn(),
        center: jest.fn(),
        close: jest.fn(),
        loadURL: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
          send: jest.fn(),
        },
      };

      (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
        () => mockOAuthWindow
      );

      // Mock successful token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          ok: true,
          access_token: 'test-token',
          scope: 'test-scope',
          team: {
            id: 'team-id',
            name: 'Test Team',
          },
          bot_user_id: 'bot-id',
        }),
      });

      await slackService.initiateOAuth();

      // Simulate OAuth callback with code
      const willNavigateCallback =
        mockOAuthWindow.webContents.on.mock.calls.find(
          (call) => call[0] === 'will-navigate'
        )?.[1];

      const event = { preventDefault: jest.fn() };
      const callbackUrl =
        'https://assembly-notes.alexkroman.com/auth/slack/callback?code=test-code';

      await willNavigateCallback(event, callbackUrl);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(global.fetch).toHaveBeenCalledWith(
        'https://assembly-notes.alexkroman.com/api/slack-oauth',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        slackInstallation: expect.objectContaining({
          teamId: 'team-id',
          teamName: 'Test Team',
          botToken: 'test-token',
        }),
      });

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-success',
        expect.objectContaining({
          teamId: 'team-id',
          teamName: 'Test Team',
        })
      );
    });

    it('should handle OAuth callback with error', async () => {
      const mockOAuthWindow = {
        focus: jest.fn(),
        show: jest.fn(),
        center: jest.fn(),
        close: jest.fn(),
        loadURL: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
          send: jest.fn(),
        },
      };

      (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
        () => mockOAuthWindow
      );

      await slackService.initiateOAuth();

      // Simulate OAuth callback with error
      const willNavigateCallback =
        mockOAuthWindow.webContents.on.mock.calls.find(
          (call) => call[0] === 'will-navigate'
        )?.[1];

      const event = { preventDefault: jest.fn() };
      const callbackUrl =
        'https://assembly-notes.alexkroman.com/auth/slack/callback?error=access_denied';

      willNavigateCallback(event, callbackUrl);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth error:',
        'access_denied'
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-error',
        'access_denied'
      );
      expect(mockOAuthWindow.close).toHaveBeenCalled();
    });

    it('should handle loadURL errors', async () => {
      const mockOAuthWindow = {
        focus: jest.fn(),
        show: jest.fn(),
        center: jest.fn(),
        loadURL: jest.fn().mockRejectedValue(new Error('Network error')),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
          send: jest.fn(),
        },
      };

      (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
        () => mockOAuthWindow
      );

      await expect(slackService.initiateOAuth()).rejects.toThrow(
        'Network error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load OAuth URL:',
        expect.any(Error)
      );
    });

    it('should handle ERR_ABORTED errors gracefully', async () => {
      const mockOAuthWindow = {
        focus: jest.fn(),
        show: jest.fn(),
        center: jest.fn(),
        loadURL: jest
          .fn()
          .mockRejectedValue(new Error('ERR_ABORTED: Navigation aborted')),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
          send: jest.fn(),
        },
      };

      (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
        () => mockOAuthWindow
      );

      await expect(slackService.initiateOAuth()).resolves.not.toThrow();
    });
  });

  describe('removeInstallation', () => {
    it('should clear installation and channels', () => {
      slackService.removeInstallation();

      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        slackInstallation: null,
        slackChannels: '',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Removed current Slack installation'
      );
    });
  });

  describe('getCurrentInstallation', () => {
    it('should return current installation from state', () => {
      const mockInstallation: SlackInstallation = {
        teamId: 'team-id',
        teamName: 'Test Team',
        botToken: 'test-token',
        botUserId: 'bot-id',
        scope: 'test-scope',
        installedAt: Date.now(),
      };

      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      const result = slackService.getCurrentInstallation();

      expect(result).toEqual(mockInstallation);
    });

    it('should return null when no installation', () => {
      const result = slackService.getCurrentInstallation();

      expect(result).toBeNull();
    });
  });

  describe('postMessage', () => {
    const mockInstallation: SlackInstallation = {
      teamId: 'team-id',
      teamName: 'Test Team',
      botToken: 'test-token',
      botUserId: 'bot-id',
      scope: 'test-scope',
      installedAt: Date.now(),
    };

    it('should successfully post message to Slack', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

      const result = await slackService.postMessage(
        'Test message',
        'channel-id'
      );

      expect(result).toEqual({ success: true });
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockInstallation.botToken}`,
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('channel-id'),
        })
      );
    });

    it('should convert markdown to Slack mrkdwn format', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

      await slackService.postMessage('**bold text**\n# Header', 'channel-id');

      const postCall = (mockHttpClient.post as jest.Mock).mock.calls[0];
      const body = JSON.parse(postCall[1].body);

      expect(body.text).toContain('*bold text*');
      expect(body.text).toContain('*Header*');
    });

    it('should handle no installation error', async () => {
      const result = await slackService.postMessage(
        'Test message',
        'channel-id'
      );

      expect(result).toEqual({
        success: false,
        error:
          'No Slack workspace connected. Please connect a workspace first.',
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle no channel error', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      const result = await slackService.postMessage('Test message');

      expect(result).toEqual({
        success: false,
        error: 'No channel selected. Please select a channel first.',
      });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle Slack API error', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest
          .fn()
          .mockResolvedValue({ ok: false, error: 'channel_not_found' }),
      });

      const result = await slackService.postMessage(
        'Test message',
        'channel-id'
      );

      expect(result).toEqual({
        success: false,
        error: 'channel_not_found',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        'channel_not_found',
        expect.objectContaining({
          messageLength: expect.any(Number),
          blocksCount: expect.any(Number),
        })
      );
    });

    it('should handle network error', async () => {
      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      (mockHttpClient.post as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await slackService.postMessage(
        'Test message',
        'channel-id'
      );

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        expect.any(Error)
      );
    });
  });

  describe('isConfigured', () => {
    it('should return true when installation exists', () => {
      const mockInstallation: SlackInstallation = {
        teamId: 'team-id',
        teamName: 'Test Team',
        botToken: 'test-token',
        botUserId: 'bot-id',
        scope: 'test-scope',
        installedAt: Date.now(),
      };

      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      expect(slackService.isConfigured()).toBe(true);
    });

    it('should return false when no installation', () => {
      expect(slackService.isConfigured()).toBe(false);
    });
  });

  describe('getCurrentInstallationInfo', () => {
    it('should return installation info when configured', () => {
      const mockInstallation: SlackInstallation = {
        teamId: 'team-id',
        teamName: 'Test Team',
        botToken: 'test-token',
        botUserId: 'bot-id',
        scope: 'test-scope',
        installedAt: Date.now(),
      };

      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      const result = slackService.getCurrentInstallationInfo();

      expect(result).toEqual({
        teamName: 'Test Team',
      });
    });

    it('should return null when not configured', () => {
      const result = slackService.getCurrentInstallationInfo();

      expect(result).toBeNull();
    });
  });

  describe('convertMarkdownToSlackMrkdwn', () => {
    it('should convert bold markdown to Slack format', async () => {
      const mockInstallation: SlackInstallation = {
        teamId: 'team-id',
        teamName: 'Test Team',
        botToken: 'test-token',
        botUserId: 'bot-id',
        scope: 'test-scope',
        installedAt: Date.now(),
      };

      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

      await slackService.postMessage(
        '**bold text** and normal text',
        'channel-id'
      );

      const postCall = (mockHttpClient.post as jest.Mock).mock.calls[0];
      const body = JSON.parse(postCall[1].body);

      expect(body.text).toBe('*bold text* and normal text');
    });

    it('should convert headers to bold text', async () => {
      const mockInstallation: SlackInstallation = {
        teamId: 'team-id',
        teamName: 'Test Team',
        botToken: 'test-token',
        botUserId: 'bot-id',
        scope: 'test-scope',
        installedAt: Date.now(),
      };

      mockStore.getState.mockReturnValue(
        createDefaultState({ slackInstallation: mockInstallation })
      );

      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

      await slackService.postMessage('# Header 1\n## Header 2', 'channel-id');

      const postCall = (mockHttpClient.post as jest.Mock).mock.calls[0];
      const body = JSON.parse(postCall[1].body);

      expect(body.text).toBe('*Header 1*\n*Header 2*');
    });
  });

  describe('exchangeCodeForToken error handling', () => {
    it('should handle OAuth token exchange failure', async () => {
      const mockOAuthWindow = {
        focus: jest.fn(),
        show: jest.fn(),
        center: jest.fn(),
        close: jest.fn(),
        loadURL: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        webContents: {
          on: jest.fn(),
          send: jest.fn(),
        },
      };

      (BrowserWindow as unknown as jest.Mock).mockImplementationOnce(
        () => mockOAuthWindow
      );

      // Mock failed token exchange
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          ok: false,
          error: 'invalid_code',
        }),
      });

      await slackService.initiateOAuth();

      // Simulate OAuth callback with code
      const willNavigateCallback =
        mockOAuthWindow.webContents.on.mock.calls.find(
          (call) => call[0] === 'will-navigate'
        )?.[1];

      const event = { preventDefault: jest.fn() };
      const callbackUrl =
        'https://assembly-notes.alexkroman.com/auth/slack/callback?code=bad-code';

      await willNavigateCallback(event, callbackUrl);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'OAuth callback error:',
        expect.any(Error)
      );
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'slack-oauth-error',
        'Failed to complete OAuth flow'
      );
      expect(mockOAuthWindow.close).toHaveBeenCalled();
    });
  });
});
