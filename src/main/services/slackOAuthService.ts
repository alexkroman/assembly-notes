import { createServer, Server } from 'http';
import { parse } from 'url';

import { BrowserWindow } from 'electron';
import { inject, injectable } from 'tsyringe';

import { SlackInstallation } from '../../types/common.js';
import type { DatabaseService } from '../database.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import type { SettingsService } from './settingsService.js';

// Slack OAuth configuration
// Users must create their own Slack app and enter credentials in the Settings UI
// This ensures complete control over their integration and security
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

@injectable()
export class SlackOAuthService {
  private oauthWindow: BrowserWindow | null = null;
  private oauthServer: Server | null = null;
  private tempClientId = '';
  private tempClientSecret = '';

  constructor(
    @inject(DI_TOKENS.DatabaseService) private database: DatabaseService,
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.MainWindow) private mainWindow: BrowserWindow,
    @inject(DI_TOKENS.SettingsService) private settingsService: SettingsService
  ) {}

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
        webSecurity: false, // Temporarily disable for OAuth
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
      },
      parent: this.mainWindow,
      modal: false, // Don't make it modal so it's easier to see
      show: false,
      title: 'Connect to Slack - Assembly Notes',
      autoHideMenuBar: true,
      alwaysOnTop: true, // Keep it on top
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

  /**
   * Gets the current Slack installation
   */
  getCurrentInstallation(): SlackInstallation | null {
    const settings = this.database.getSettings();
    return settings.slackInstallation;
  }
}
