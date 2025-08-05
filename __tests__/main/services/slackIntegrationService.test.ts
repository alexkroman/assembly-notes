import type { SlackInstallation } from '../../../src/types/common';
import { SlackIntegrationService, IHttpClient } from '../../../src/main/services/slackIntegrationService';

// Create mock Store
const createMockStore = (installation: SlackInstallation | null = null) => ({
  getState: jest.fn(() => ({
    settings: {
      slackInstallation: installation,
    },
  })),
});

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Minimal mock mainWindow with webContents.send stub
const mockMainWindow = {
  webContents: {
    send: jest.fn(),
  },
} as any;

// Helper to create a SlackIntegrationService instance
const createService = (store: any, httpClient: jest.Mocked<IHttpClient>) =>
  new SlackIntegrationService(
    store as any,
    mockLogger as any,
    mockMainWindow,
    // SettingsService is not used in postMessage / isConfigured tests
    ({ updateSettings: jest.fn() } as any),
    httpClient
  );

// Shared Slack installation fixture
const installation: SlackInstallation = {
  teamId: 'T123',
  teamName: 'Test Team',
  botToken: 'xoxb-test-token',
  botUserId: 'U123',
  scope: 'chat:write',
  installedAt: Date.now(),
};

describe('SlackIntegrationService.postMessage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when no Slack workspace connected', async () => {
    const store = createMockStore(null);
    const mockHttpClient = { post: jest.fn() } as any;
    const service = createService(store, mockHttpClient);

    const result = await service.postMessage('Hello world', 'C123');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No Slack workspace connected/i);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('returns error when channelId is missing', async () => {
    const store = createMockStore(installation);
    const mockHttpClient = { post: jest.fn() } as any;
    const service = createService(store, mockHttpClient);

    const result = await service.postMessage('Hello world');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No channel selected/i);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('posts message successfully to Slack', async () => {
    const store = createMockStore(installation);
    const mockHttpClient: jest.Mocked<IHttpClient> = {
      post: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    } as any;

    const service = createService(store, mockHttpClient);

    const result = await service.postMessage('**Bold** text', 'C123');

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${installation.botToken}`,
        }),
      })
    );

    expect(result).toEqual({ success: true });
  });

  it('handles Slack API error response', async () => {
    const store = createMockStore(installation);
    const mockHttpClient: jest.Mocked<IHttpClient> = {
      post: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, error: 'invalid_auth' }),
      }),
    } as any;

    const service = createService(store, mockHttpClient);

    const result = await service.postMessage('Oops', 'C123');

    expect(result).toEqual({ success: false, error: 'invalid_auth' });
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to post to Slack:',
      'invalid_auth'
    );
  });

  it('handles network failure', async () => {
    const store = createMockStore(installation);
    const mockHttpClient: jest.Mocked<IHttpClient> = {
      post: jest.fn().mockRejectedValue(new Error('network down')),
    } as any;

    const service = createService(store, mockHttpClient);

    const result = await service.postMessage('Hi', 'C123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('network down');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('SlackIntegrationService configuration helpers', () => {
  it('isConfigured returns true when installation exists', () => {
    const store = createMockStore(installation);
    const service = createService(store, { post: jest.fn() } as any);

    expect(service.isConfigured()).toBe(true);
  });

  it('isConfigured returns false when no installation', () => {
    const store = createMockStore(null);
    const service = createService(store, { post: jest.fn() } as any);

    expect(service.isConfigured()).toBe(false);
  });
});

describe('SlackIntegrationService helper methods', () => {
  it('convertMarkdownToSlackMrkdwn converts bold and headers', async () => {
    const store = createMockStore(installation);
    const service = createService(store, { post: jest.fn() } as any) as any;

    const input = '**Bold** text\n# Header\n## Subheader';
    const expected = '*Bold* text\n*Header*\n*Subheader*';

    const output = service.convertMarkdownToSlackMrkdwn(input);
    expect(output).toBe(expected);
  });

  it('getCurrentInstallation returns installation from store', () => {
    const store = createMockStore(installation);
    const service = createService(store, { post: jest.fn() } as any);

    expect(service.getCurrentInstallation()).toBe(installation);
  });

  it('getCurrentInstallationInfo returns teamName', () => {
    const store = createMockStore(installation);
    const service = createService(store, { post: jest.fn() } as any);

    expect(service.getCurrentInstallationInfo()).toEqual({ teamName: 'Test Team' });
  });

  it('removeInstallation clears installation and channels via settingsService', () => {
    const store = createMockStore(installation);
    const mockSettingsService = { updateSettings: jest.fn() } as any;
    const service = new SlackIntegrationService(
      store as any,
      mockLogger as any,
      mockMainWindow,
      mockSettingsService,
      { post: jest.fn() } as any
    );

    service.removeInstallation();

    expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
      slackInstallation: null,
      slackChannels: '',
    });
    expect(mockLogger.info).toHaveBeenCalledWith('Removed current Slack installation');
  });
});