import { createServer, Server } from 'http';
import { parse } from 'url';

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
const SLACK_REDIRECT_URI = 'http://localhost:3000/auth/slack/callback';

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
  private oauthServer: Server | null = null;

  constructor(
    @inject(DI_TOKENS.DatabaseService) private database: DatabaseService,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow
  ) {}

  /**
   * Initiates the Slack OAuth flow using a temporary HTTP server
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

    // Start temporary HTTP server to handle OAuth callback
    await this.startOAuthServer();

    const authUrl =
      `https://slack.com/oauth/v2/authorize?` +
      `client_id=${SLACK_CLIENT_ID}&` +
      `scope=channels:read,groups:read,im:read,im:write,mpim:read,mpim:write,chat:write,chat:write.public,users:read&` +
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
      this.stopOAuthServer();
    });

    // Load the OAuth URL
    await this.oauthWindow.loadURL(authUrl);
    this.oauthWindow.show();
  }

  /**
   * Starts a temporary HTTP server to handle OAuth callback
   */
  private async startOAuthServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.oauthServer = createServer((req, res) => {
        const url = req.url;
        if (!url) return;

        const parsedUrl = parse(url, true);

        if (parsedUrl.pathname === '/auth/slack/callback') {
          // Send success page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>✅ Successfully connected to Slack!</h1>
                <p>You can close this window and return to Assembly Notes.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);

          // Process the OAuth callback
          void this.handleOAuthCallback(parsedUrl.query);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });

      this.oauthServer.listen(3000, 'localhost', () => {
        this.logger.info('OAuth server started on http://localhost:3000');
        resolve();
      });

      this.oauthServer.on('error', (error) => {
        this.logger.error('OAuth server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stops the temporary HTTP server
   */
  private stopOAuthServer(): void {
    if (this.oauthServer) {
      this.oauthServer.close();
      this.oauthServer = null;
      this.logger.info('OAuth server stopped');
    }
  }

  /**
   * Handles the OAuth callback parameters
   */
  private async handleOAuthCallback(query: Record<string, string | string[] | undefined>): Promise<void> {
    try {
      const code = Array.isArray(query['code']) ? query['code'][0] : query['code'];
      const error = Array.isArray(query['error']) ? query['error'][0] : query['error'];

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
   * Closes the OAuth window and stops the server
   */
  private closeOAuthWindow(): void {
    if (this.oauthWindow) {
      this.oauthWindow.close();
      this.oauthWindow = null;
    }
    this.stopOAuthServer();
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
}
