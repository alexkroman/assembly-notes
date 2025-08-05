import { createServer, Server } from 'http';
import { parse } from 'url';

import type { Store } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import { inject, injectable } from 'tsyringe';

import { SlackInstallation } from '../../types/common.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import type { SettingsService } from './settingsService.js';
import { RootState } from '../store/store.js';

// Slack API response interface
interface SlackApiResponse {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

// Slack OAuth configuration
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
export class SlackIntegrationService {
  private oauthWindow: BrowserWindow | null = null;
  private oauthServer: Server | null = null;
  private tempClientId = '';
  private tempClientSecret = '';

  constructor(
    @inject(DI_TOKENS.Store) private store: Store<RootState>,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow,
    @inject(DI_TOKENS.SettingsService) private settingsService: SettingsService,
    @inject(DI_TOKENS.HttpClient) private httpClient: IHttpClient
  ) {}

  // ========== OAuth Methods ==========

  /**
   * Initiates the Slack OAuth flow using a temporary HTTP server
   */
  async initiateOAuth(clientId: string, clientSecret: string): Promise<void> {
    // Check if OAuth credentials are provided
    if (!clientId || !clientSecret) {
      const error = new Error('Slack OAuth credentials are required.');
      this.logger.error('OAuth configuration missing:', error.message);
      this.mainWindow.webContents.send(
        'slack-oauth-error',
        'Please enter both Slack Client ID and Client Secret.'
      );
      return;
    }

    // Store credentials temporarily for this OAuth flow
    this.tempClientId = clientId;
    this.tempClientSecret = clientSecret;

    if (this.oauthWindow) {
      this.oauthWindow.focus();
      return;
    }

    // Start temporary HTTP server to handle OAuth callback
    await this.startOAuthServer();

    const authUrl =
      `https://slack.com/oauth/v2/authorize?` +
      `client_id=${this.tempClientId}&` +
      `scope=channels:read,groups:read,im:read,im:write,mpim:read,mpim:write,chat:write,chat:write.public,users:read&` +
      `redirect_uri=${encodeURIComponent(SLACK_REDIRECT_URI)}`;

    // Create OAuth window
    this.oauthWindow = new BrowserWindow({
      width: 800,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        experimentalFeatures: true,
      },
      parent: this.mainWindow,
      modal: false,
      show: false,
      title: 'Connect to Slack - Assembly-Notes',
      autoHideMenuBar: true,
      alwaysOnTop: true,
      resizable: true,
      minimizable: false,
      maximizable: false,
    });

    // Handle window closed
    this.oauthWindow.on('closed', () => {
      this.oauthWindow = null;
      this.stopOAuthServer();
    });

    // Add error handling for URL loading
    this.oauthWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        this.logger.error('OAuth window failed to load:', {
          errorCode,
          errorDescription,
          validatedURL,
        });
      }
    );

    this.oauthWindow.webContents.on('did-finish-load', () => {
      this.logger.info('OAuth window loaded successfully');
    });

    // Handle navigation events
    this.oauthWindow.webContents.on(
      'will-navigate',
      (_event, navigationUrl) => {
        this.logger.info('OAuth window navigating to:', navigationUrl);
      }
    );

    this.oauthWindow.webContents.on('did-navigate', (_event, url) => {
      this.logger.info('OAuth window navigated to:', url);
    });

    // Load the OAuth URL
    this.logger.info('Loading OAuth URL:', authUrl);

    // Show the window immediately and then load the URL
    this.oauthWindow.show();
    this.oauthWindow.focus();
    this.oauthWindow.center();

    try {
      await this.oauthWindow.loadURL(authUrl);
      this.logger.info('OAuth window should now be visible');
    } catch (error: unknown) {
      this.logger.error('Failed to load OAuth URL:', error);
      // Don't throw the error if it's just the redirect abort
      if (error instanceof Error && !error.message.includes('ERR_ABORTED')) {
        throw error;
      }
      this.logger.info(
        'Ignoring ERR_ABORTED error - this is normal for OAuth redirects'
      );
    }
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
                <p>You can close this window and return to Assembly-Notes.</p>
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
  private async handleOAuthCallback(
    query: Record<string, string | string[] | undefined>
  ): Promise<void> {
    try {
      const code = Array.isArray(query['code'])
        ? query['code'][0]
        : query['code'];
      const error = Array.isArray(query['error'])
        ? query['error'][0]
        : query['error'];

      if (error) {
        this.logger.error('OAuth error:', error);
        this.mainWindow.webContents.send('slack-oauth-error', error);
        this.closeOAuthWindow();
        return;
      }

      if (code) {
        const installation = await this.exchangeCodeForToken(code);
        this.saveInstallation(installation);

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
        client_id: this.tempClientId,
        client_secret: this.tempClientSecret,
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
   * Saves Slack installation to database and updates Redux store
   */
  private saveInstallation(installation: SlackInstallation): void {
    // Update settings using SettingsService, which will update both database and Redux
    this.settingsService.updateSettings({
      slackInstallation: installation,
    });

    // Clear temporary credentials
    this.tempClientId = '';
    this.tempClientSecret = '';

    this.logger.info(
      `Slack installation saved for team: ${installation.teamName}`
    );
  }

  /**
   * Removes the current Slack installation
   */
  removeInstallation(): void {
    this.settingsService.updateSettings({
      slackInstallation: null,
      slackChannels: '', // Clear selected channels
    });
    this.logger.info('Removed current Slack installation');
  }

  // ========== Messaging Methods ==========

  /**
   * Gets the current Slack installation from state/database
   */
  getCurrentInstallation(): SlackInstallation | null {
    const state = this.store.getState();
    const settings = state.settings;
    return settings.slackInstallation;
  }

  /**
   * Converts markdown to Slack's mrkdwn format
   */
  private convertMarkdownToSlackMrkdwn(markdown: string): string {
    // Convert double asterisks to single asterisks for bold
    let mrkdwn = markdown.replace(/\*\*(.+?)\*\*/g, '*$1*');

    // Ensure headers on their own lines are bolded
    mrkdwn = mrkdwn.replace(/^(#+ )(.+)$/gm, '*$2*');

    return mrkdwn;
  }

  /**
   * Posts a message to a Slack channel
   */
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
      // Convert markdown to Slack's mrkdwn format
      const slackMessage = this.convertMarkdownToSlackMrkdwn(message);

      const response = await this.httpClient.post(
        'https://slack.com/api/chat.postMessage',
        {
          headers: {
            Authorization: `Bearer ${installation.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: targetChannelId,
            text: slackMessage,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: slackMessage,
                },
              },
            ],
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
