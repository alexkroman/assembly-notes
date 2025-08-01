import { Store } from '@reduxjs/toolkit';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import {
  IHttpClient,
  SlackService,
} from '../../../src/main/services/slackService';
import { createMockInstallation } from '../../utils/testHelpers.js';

// Mock HTTP client
const mockHttpClient = {
  post: jest.fn(),
} as jest.Mocked<IHttpClient>;

describe('SlackService', () => {
  let slackService: SlackService;
  let mockStore: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mocks for each test with OAuth-based structure
    mockStore = {
      getState: jest.fn(() => ({
        settings: {
          slackInstallation: createMockInstallation(),
          slackChannels: '#general,#dev',
        },
      })),
      dispatch: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Register mocks in container
    container.register(DI_TOKENS.Store, {
      useValue: mockStore as unknown as Store,
    });
    container.register(DI_TOKENS.Logger, { useValue: mockLogger });
    container.register(DI_TOKENS.HttpClient, { useValue: mockHttpClient });

    slackService = container.resolve(SlackService);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('postMessage', () => {
    it('should post message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          headers: {
            Authorization: 'Bearer test-bot-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: 'C123456',
            text: 'Test message',
          }),
        }
      );
    });

    it('should use custom channel when provided', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      await slackService.postMessage('Test message', 'C789012');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          headers: {
            Authorization: 'Bearer test-bot-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: 'C789012',
            text: 'Test message',
          }),
        }
      );
    });

    it('should fail when no installation is available', async () => {
      mockStore.getState.mockReturnValue({
        settings: {
          slackInstallation: null,
        },
      });

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No Slack workspace connected. Please connect a workspace first.'
      );
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should fail when no channel ID is provided', async () => {
      mockStore.getState.mockReturnValue({
        settings: {
          slackInstallation: createMockInstallation(),
        },
      });

      const result = await slackService.postMessage('Test message');

      expect(result.success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No channel selected. Please select a channel first.'
      );
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should handle Slack API errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: false,
          error: 'channel_not_found',
        }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        'channel_not_found'
      );
    });

    it('should handle Slack API errors without error message', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: false }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        'Unknown error'
      );
    });

    it('should handle network errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        expect.any(Error)
      );
    });

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        expect.any(Error)
      );
    });

    it('should handle empty message', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: false, error: 'no_text' }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        'no_text'
      );
    });

    it('should handle special characters in message', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const specialMessage = 'Test with 🚀 emojis and @mentions #hashtags';
      const result = await slackService.postMessage(specialMessage, 'C123456');

      expect(result.success).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should handle response without ok property', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        'Unknown error'
      );
    });

    it('should handle HTTP client response that is not ok', async () => {
      const mockResponse = {
        ok: false, // HTTP response not ok (network level)
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'server_error' }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        'server_error'
      );
    });
  });

  describe('configuration validation', () => {
    it('should validate token format', async () => {
      mockStore.getState.mockReturnValue({
        settings: {
          slackInstallation: createMockInstallation({
            botToken: 'invalid-token',
          }),
        },
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: false,
          error: 'invalid_auth',
        }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await slackService.postMessage('Test message', 'C123456');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to post to Slack:',
        'invalid_auth'
      );
    });

    it('should handle channel with different formats', async () => {
      // Reset mock store state to use proper test token
      mockStore.getState.mockReturnValue({
        settings: {
          slackInstallation: createMockInstallation(),
          slackChannels: '#general,#dev',
        },
      });

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      };
      mockHttpClient.post.mockResolvedValue(mockResponse);

      // Test with channel ID
      await slackService.postMessage('Test message', 'C1234567890');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          headers: {
            Authorization: 'Bearer test-bot-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: 'C1234567890',
            text: 'Test message',
          }),
        }
      );
    });
  });

  describe('isConfigured', () => {
    it('should return true when installation and channel are configured', () => {
      const result = slackService.isConfigured();

      expect(result).toBe(true);
    });

    it('should return false when no installation is selected', () => {
      mockStore.getState.mockReturnValue({
        settings: {
          slackInstallation: null,
        },
      });

      const result = slackService.isConfigured();

      expect(result).toBe(false);
    });

    it('should return true when installation is present', () => {
      mockStore.getState.mockReturnValue({
        settings: {
          slackInstallation: createMockInstallation(),
        },
      });

      const result = slackService.isConfigured();

      expect(result).toBe(true);
    });
  });

  describe('getCurrentInstallationInfo', () => {
    it('should return installation info when configured', () => {
      const result = slackService.getCurrentInstallationInfo();

      expect(result).toEqual({
        teamName: 'Test Team',
      });
    });

    it('should return null when no installation is selected', () => {
      mockStore.getState.mockReturnValue({
        settings: {
          slackInstallation: null,
        },
      });

      const result = slackService.getCurrentInstallationInfo();

      expect(result).toBeNull();
    });
  });
});
