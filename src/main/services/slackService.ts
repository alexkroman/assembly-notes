import type { Store } from '@reduxjs/toolkit';
import { inject, injectable } from 'tsyringe';

import { SlackInstallation } from '../../types/common.js';
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

  private getCurrentInstallation(): SlackInstallation | null {
    const state = this.store.getState();
    const settings = state.settings;
    const selectedTeamId = settings.selectedSlackInstallation;
    const installations = settings.slackInstallations;
    return (
      installations.find(
        (inst: SlackInstallation) => inst.teamId === selectedTeamId
      ) ?? null
    );
  }

  async postMessage(
    message: string,
    channelId?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Get current OAuth installation
    const installation = this.getCurrentInstallation();

    // Use provided channelId
    const targetChannelId = channelId;

    if (!installation) {
      const error =
        'No Slack workspace connected. Please connect a workspace first.';
      this.logger.warn(error);
      return { success: false, error };
    }

    if (!targetChannelId) {
      const error = 'No channel selected. Please select a channel first.';
      this.logger.warn(error);
      return { success: false, error };
    }

    try {
      const response = await this.httpClient.post(
        'https://slack.com/api/chat.postMessage',
        {
          headers: {
            Authorization: `Bearer ${installation.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: targetChannelId,
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

  /**
   * Check if Slack is properly configured
   */
  isConfigured(): boolean {
    const installation = this.getCurrentInstallation();

    return !!installation;
  }

  /**
   * Get current installation info for UI display
   */
  getCurrentInstallationInfo(): {
    teamName: string;
  } | null {
    const installation = this.getCurrentInstallation();

    if (!installation) {
      return null;
    }

    return {
      teamName: installation.teamName,
    };
  }
}
