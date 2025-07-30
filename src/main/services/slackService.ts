import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import { RootState } from '../store/store.js';

// Slack API response interface
interface SlackApiResponse {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

// Abstract interface for HTTP client
export interface IHttpClient {
  post(
    url: string,
    options: { headers: Record<string, string>; body: string }
  ): Promise<{
    ok: boolean;
    json(): Promise<SlackApiResponse>;
  }>;
}

// Concrete implementation using fetch
export class FetchHttpClient implements IHttpClient {
  async post(
    url: string,
    options: { headers: Record<string, string>; body: string }
  ) {
    const response = await fetch(url, {
      method: 'POST',
      headers: options.headers,
      body: options.body,
    });

    return {
      ok: response.ok,
      json: () => response.json(),
    };
  }
}

@injectable()
export class SlackService {
  constructor(
    @inject(DI_TOKENS.Store) private store: Store<RootState>,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.HttpClient) private httpClient: IHttpClient
  ) {}

  async postMessage(
    message: string,
    channel?: string
  ): Promise<{ success: boolean; error?: string }> {
    const state = this.store.getState();
    const settings = state.settings;
    const slackBotToken = settings.slackBotToken;
    const targetChannel = channel ?? settings.selectedSlackChannel;

    if (!slackBotToken || !targetChannel) {
      const error = 'Slack bot token or channel not configured';
      this.logger.warn(error);
      return { success: false, error };
    }

    try {
      const response = await this.httpClient.post(
        'https://slack.com/api/chat.postMessage',
        {
          headers: {
            Authorization: `Bearer ${slackBotToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: targetChannel,
            text: message,
          }),
        }
      );

      const result = await response.json();

      if (result.ok === true) {
        return { success: true };
      } else {
        const error = result.error ?? 'Unknown error';
        this.logger.error('Failed to post to Slack:', error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Network error';
      this.logger.error('Failed to post to Slack:', error);
      return { success: false, error: errorMessage };
    }
  }
}
