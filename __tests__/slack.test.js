const { WebClient } = require('@slack/web-api');
const { postToSlack, resetSlackClient } = require('../src/main/slack');
const { getSettings } = require('../src/main/settings');

jest.mock('@slack/web-api');
jest.mock('../src/main/settings');
jest.mock('../src/main/logger.js', () => ({
  error: jest.fn(),
}));

describe('Slack Module', () => {
  let mockWebClient;
  let mockPostMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPostMessage = jest.fn().mockResolvedValue({ ok: true });
    mockWebClient = {
      chat: {
        postMessage: mockPostMessage,
      },
      token: 'test-token',
    };
    WebClient.mockImplementation(() => mockWebClient);
    resetSlackClient();
  });

  describe('postToSlack', () => {
    it('should post message to Slack with correct formatting', async () => {
      getSettings.mockReturnValue({
        slackToken: 'test-token',
        slackChannel: 'test-channel',
      });

      await postToSlack('Test summary', 'Test Title');

      expect(WebClient).toHaveBeenCalledWith('test-token');
      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: 'test-channel',
        text: '*Test Title*\n\nTest summary',
        mrkdwn: true,
      });
    });

    it('should not post if slackToken is missing', async () => {
      getSettings.mockReturnValue({
        slackToken: '',
        slackChannel: 'test-channel',
      });

      await postToSlack('Test summary', 'Test Title');

      expect(WebClient).not.toHaveBeenCalled();
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should not post if slackChannel is missing', async () => {
      getSettings.mockReturnValue({
        slackToken: 'test-token',
        slackChannel: '',
      });

      await postToSlack('Test summary', 'Test Title');

      expect(WebClient).not.toHaveBeenCalled();
      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should reuse existing slack client if token unchanged', async () => {
      getSettings.mockReturnValue({
        slackToken: 'test-token',
        slackChannel: 'test-channel',
      });

      await postToSlack('First message', 'First Title');
      await postToSlack('Second message', 'Second Title');

      expect(WebClient).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledTimes(2);
    });

    it('should create new client if token changes', async () => {
      getSettings
        .mockReturnValueOnce({
          slackToken: 'test-token-1',
          slackChannel: 'test-channel',
        })
        .mockReturnValueOnce({
          slackToken: 'test-token-2',
          slackChannel: 'test-channel',
        });

      await postToSlack('First message', 'First Title');
      await postToSlack('Second message', 'Second Title');

      expect(WebClient).toHaveBeenCalledTimes(2);
      expect(WebClient).toHaveBeenCalledWith('test-token-1');
      expect(WebClient).toHaveBeenCalledWith('test-token-2');
    });

    it('should handle errors gracefully', async () => {
      const log = require('../src/main/logger.js');
      getSettings.mockReturnValue({
        slackToken: 'test-token',
        slackChannel: 'test-channel',
      });

      const error = new Error('Slack API error');
      mockPostMessage.mockRejectedValue(error);

      await postToSlack('Test summary', 'Test Title');

      expect(log.error).toHaveBeenCalledWith(
        'Error posting to Slack: Slack API error'
      );
    });
  });

  describe('resetSlackClient', () => {
    it('should reset the slack client', async () => {
      getSettings.mockReturnValue({
        slackToken: 'test-token',
        slackChannel: 'test-channel',
      });

      await postToSlack('First message', 'First Title');
      resetSlackClient();
      await postToSlack('Second message', 'Second Title');

      expect(WebClient).toHaveBeenCalledTimes(2);
    });
  });
});
