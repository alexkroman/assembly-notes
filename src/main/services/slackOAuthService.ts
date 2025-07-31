import { BrowserWindow } from 'electron';
import { inject, injectable } from 'tsyringe';

import {
  SlackInstallation,
  SlackChannel,
  SettingsSchema,
} from '../../types/common.js';
import type { DatabaseService } from '../database.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';

// Slack OAuth configuration
// For open source Electron apps, there are a few approaches:
// 1. Use environment variables during build (not runtime)
// 2. Use a proxy server to handle OAuth flow
// 3. Have users create their own Slack app and enter credentials
//
// This app uses approach #1 - credentials are injected at build time
const SLACK_CLIENT_ID =
  process.env['SLACK_CLIENT_ID'] ?? 'YOUR_SLACK_CLIENT_ID_HERE';
const SLACK_CLIENT_SECRET =
  process.env['SLACK_CLIENT_SECRET'] ?? 'YOUR_SLACK_CLIENT_SECRET_HERE';
const SLACK_REDIRECT_URI = 'assemblyai://auth/slack/callback';

interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  scope: string;
  team: {
    id: string;
    name: string;
  };
  bot_user_id: string;
  error?: string;
}

interface SlackChannelsResponse {
  ok: boolean;
  channels: {
    id: string;
    name: string;
    is_private: boolean;
    is_member: boolean;
  }[];
  error?: string;
}

@injectable()
export class SlackOAuthService {
  private oauthWindow: BrowserWindow | null = null;

  constructor(
    @inject(DI_TOKENS.DatabaseService) private database: DatabaseService,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow
  ) {}

  /**
   * Initiates the Slack OAuth flow using Electron BrowserWindow
   */
  async initiateOAuth(): Promise<void> {
    // Check if OAuth credentials are configured
    if (
      SLACK_CLIENT_ID === 'YOUR_SLACK_CLIENT_ID_HERE' ||
      SLACK_CLIENT_SECRET === 'YOUR_SLACK_CLIENT_SECRET_HERE'
    ) {
      const error = new Error(
        'Slack OAuth is not configured. Please build the app with SLACK_CLIENT_ID and SLACK_CLIENT_SECRET environment variables.'
      );
      this.logger.error('OAuth configuration missing:', error.message);
      this.mainWindow.webContents.send(
        'slack-oauth-error',
        'Slack integration is not configured in this build.'
      );
      return;
    }

    if (this.oauthWindow) {
      this.oauthWindow.focus();
      return;
    }

    const authUrl =
      `https://slack.com/oauth/v2/authorize?` +
      `client_id=${SLACK_CLIENT_ID}&` +
      `scope=channels:read,chat:write&` +
      `redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}`;

    // Create OAuth window
    this.oauthWindow = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
      parent: this.mainWindow,
      modal: true,
      show: false,
      title: 'Connect to Slack',
    });

    // Handle window closed
    this.oauthWindow.on('closed', () => {
      this.oauthWindow = null;
    });

    // Handle navigation to capture the callback
    this.oauthWindow.webContents.on(
      'will-redirect',
      (_event, navigationUrl) => {
        void this.handleOAuthCallback(navigationUrl);
      }
    );

    this.oauthWindow.webContents.on('did-navigate', (_event, navigationUrl) => {
      void this.handleOAuthCallback(navigationUrl);
    });

    // Load the OAuth URL
    await this.oauthWindow.loadURL(authUrl);
    this.oauthWindow.show();
  }

  /**
   * Handles the OAuth callback URL
   */
  private async handleOAuthCallback(url: string): Promise<void> {
    if (!url.startsWith(SLACK_REDIRECT_URI)) {
      return;
    }

    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (error) {
        this.logger.error('OAuth error:', error);
        this.mainWindow.webContents.send('slack-oauth-error', error);
        this.closeOAuthWindow();
        return;
      }

      if (code) {
        const installation = await this.exchangeCodeForToken(code);
        this.saveInstallation(installation);
        await this.refreshChannels(installation.teamId);

        // Notify the main window that OAuth is complete
        this.mainWindow.webContents.send('slack-oauth-success', installation);
        this.closeOAuthWindow();
      }
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      this.mainWindow.webContents.send(
        'slack-oauth-error',
        'Failed to complete OAuth flow'
      );
      this.closeOAuthWindow();
    }
  }

  /**
   * Closes the OAuth window
   */
  private closeOAuthWindow(): void {
    if (this.oauthWindow) {
      this.oauthWindow.close();
      this.oauthWindow = null;
    }
  }

  /**
   * Exchanges authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<SlackInstallation> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code: code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const data = (await response.json()) as SlackOAuthResponse;

    if (!data.ok || data.error) {
      throw new Error(`Slack OAuth error: ${data.error ?? 'Unknown error'}`);
    }

    return {
      teamId: data.team.id,
      teamName: data.team.name,
      botToken: data.access_token,
      botUserId: data.bot_user_id,
      scope: data.scope,
      installedAt: Date.now(),
    };
  }

  /**
   * Saves Slack installation to database
   */
  private saveInstallation(installation: SlackInstallation): void {
    const settings = this.database.getSettings();
    const existingInstallations = settings.slackInstallations;

    // Remove existing installation for this team if it exists
    const filteredInstallations = existingInstallations.filter(
      (inst: SlackInstallation) => inst.teamId !== installation.teamId
    );

    // Add new installation
    const updatedInstallations = [...filteredInstallations, installation];

    this.database.updateSettings({
      slackInstallations: updatedInstallations,
      selectedSlackInstallation: installation.teamId,
    });

    this.logger.info(
      `Slack installation saved for team: ${installation.teamName}`
    );
  }

  /**
   * Refreshes available channels for a Slack installation
   */
  async refreshChannels(teamId: string): Promise<void> {
    const settings = this.database.getSettings();
    const installations = settings.slackInstallations;
    const installation = installations.find(
      (inst: SlackInstallation) => inst.teamId === teamId
    );

    if (!installation) {
      throw new Error('Installation not found');
    }

    try {
      const response = await fetch('https://slack.com/api/conversations.list', {
        headers: {
          Authorization: `Bearer ${installation.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = (await response.json()) as SlackChannelsResponse;

      if (!data.ok || data.error) {
        throw new Error(`Slack API error: ${data.error ?? 'Unknown error'}`);
      }

      const channels: SlackChannel[] = data.channels
        .filter((channel) => channel.is_member) // Only show channels the bot has access to
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
        }));

      this.database.updateSettings({
        availableChannels: channels,
      });

      this.logger.info(
        `Refreshed ${String(channels.length)} channels for team: ${installation.teamName}`
      );
    } catch (error) {
      this.logger.error('Error refreshing channels:', error);
      throw error;
    }
  }

  /**
   * Removes a Slack installation
   */
  removeInstallation(teamId: string): void {
    const settings = this.database.getSettings();
    const installations = settings.slackInstallations;
    const filteredInstallations = installations.filter(
      (inst: SlackInstallation) => inst.teamId !== teamId
    );

    const updateData: Partial<SettingsSchema> = {
      slackInstallations: filteredInstallations,
    };

    // If we're removing the selected installation, clear selection
    if (settings.selectedSlackInstallation === teamId) {
      updateData.selectedSlackInstallation =
        filteredInstallations.length > 0
          ? (filteredInstallations[0]?.teamId ?? '')
          : '';
      updateData.availableChannels = [];
      updateData.selectedChannelId = '';
    }

    this.database.updateSettings(updateData);
    this.logger.info(`Removed Slack installation for team: ${teamId}`);
  }

  /**
   * Gets the current Slack installation
   */
  getCurrentInstallation(): SlackInstallation | null {
    const settings = this.database.getSettings();
    const installations = settings.slackInstallations;
    const selectedTeamId = settings.selectedSlackInstallation;

    if (!selectedTeamId) {
      return null;
    }

    return (
      installations.find(
        (inst: SlackInstallation) => inst.teamId === selectedTeamId
      ) ?? null
    );
  }

  /**
   * Handles protocol URL (called from main process)
   */
  async handleProtocolUrl(url: string): Promise<void> {
    if (url.startsWith('assemblyai://auth/slack/callback')) {
      await this.handleOAuthCallback(url);
    }
  }
}
