# Assembly Notes

An Electron desktop application for real-time transcription and meeting note-taking. Records both microphone input and system audio (Zoom calls, music, etc.), transcribes in real-time using AssemblyAI, and posts AI-generated summaries to Slack channels.

## Features

- **Real-time Transcription**: Dual AssemblyAI streams process microphone and system audio independently
- **Echo Cancellation**: Prevents feedback loops between microphone and system audio
- **AI Summarization**: Uses Claude (anthropic/claude-sonnet-4-20250514) via AssemblyAI Lemur
- **Slack Integration**: Automated posting to configured Slack channels
- **Cross-platform**: Built with Electron 37.2.4 for macOS, Windows, and Linux
- **TypeScript**: Strict type checking with ES2022/ESNext modules
- **SQLite Storage**: High-performance database for settings and transcription history

## Installation

### Download Latest Release

[![Latest Release](https://img.shields.io/github/v/release/alexkroman/assembly-notes?style=for-the-badge&logo=github)](https://github.com/alexkroman/assembly-notes/releases/latest)

**[📥 Download Latest Release](https://github.com/alexkroman/assembly-notes/releases/latest)**

Choose your platform:

- **macOS**: Download the `.dmg` file
- **Windows**: Download the `.exe` installer
- **Linux**: Download the `.AppImage` file

> **Note**: All releases are automatically built and tested via GitHub Actions. Visit the [releases page](https://github.com/alexkroman/assembly-notes/releases) to see all available versions.

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/alexkroman/assembly-notes.git
cd assembly-notes

# Install dependencies
npm install

# Start the development app
npm start
```

### Available Scripts

```bash
# Development
npm start              # Build TypeScript and start Electron app
npm run start:fresh    # Start with fresh state (clears cache)
npm run dev            # Run TypeScript in watch mode with Electron
npm run build:all      # Compile all TypeScript (main, preload, renderer, audio)
npm run build:main     # Compile main process TypeScript only
npm run build:preload  # Compile preload script via Vite
npm run build:renderer # Compile renderer via Vite + React
npm run build:audio-processor # Compile audio worklet processor
npm run typecheck      # Type check without emitting files

# Code Quality
npm run lint           # Run ESLint code analysis with type checking
npm run lint:fix       # Fix auto-fixable ESLint issues
npm run format         # Format code with Prettier
npm run fix            # Run both lint:fix and format

# Testing
npm test               # Run all tests (Jest unit tests + Playwright e2e)
npm run test:watch     # Run Jest tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run test:e2e       # Run Playwright end-to-end tests only
npm run test:all       # Run Jest watch and Playwright tests concurrently

# Building
npm run build          # Build for all platforms (macOS, Windows, Linux)
npm run build:mac      # Build DMG for macOS
npm run build:mac:notarized  # Build notarized macOS app (requires env vars)
npm run build:win      # Build NSIS installer for Windows
npm run build:linux    # Build AppImage for Linux
npm run pack           # Package without distributing

# Release Management
npm run release:patch  # Bump patch version and push tags
npm run release:minor  # Bump minor version and push tags
npm run release:major  # Bump major version and push tags

# Dependency Management
npm run check-updates  # Check for dependency updates
npm run update-deps    # Update all dependencies
```

## Configuration

1. **AssemblyAI API Key**: Required for real-time transcription services
2. **Slack Integration**: Set up a Slack app to enable automated posting (see setup guide below)
3. **Custom Summary Prompts**: Customize AI-generated meeting summaries
4. **Audio Processing**: Configure keep-alive settings and echo cancellation

Settings are persisted using SQLite database in your system's user data directory and persist between app sessions.

## Slack Integration Setup

Assembly Notes can automatically post AI-generated meeting summaries to your Slack workspace. Follow these steps to set up the integration:

### Step 1: Create a Slack App

1. **Go to [Slack API](https://api.slack.com/apps)** and sign in to your workspace
2. **Click "Create New App"** and select **"From an app manifest"**
3. **Choose your workspace** where you want to install Assembly Notes
4. **Copy and paste** the contents of [`slack-app-manifest.json`](./slack-app-manifest.json) from this repository
5. **Click "Next"**, review the configuration, and **click "Create"**

### Step 2: Configure OAuth & Permissions

After creating the app:

1. **Go to "OAuth & Permissions"** in the left sidebar
2. **Verify the Bot Token Scopes** include:
   - `channels:read` - View basic information about public channels
   - `groups:read` - View basic information about private channels (when invited)
   - `im:read` - View direct message channels
   - `im:write` - Send direct messages to users
   - `mpim:read` - View group direct message channels
   - `mpim:write` - Send messages to group direct messages
   - `chat:write` - Send messages as @assembly-notes
   - `chat:write.public` - Send messages to channels the app hasn't been added to
   - `users:read` - View basic user information (for DM functionality)
3. **Note the Redirect URL**: `http://localhost:3000/auth/slack/callback` (already configured in the manifest)

### Step 3: Install the App to Your Workspace

1. **Go to "Install App"** in the left sidebar
2. **Click "Install to Workspace"**
3. **Review the permissions** and click "Allow"
4. **Copy the "Bot User OAuth Token"** (starts with `xoxb-`) - you'll need this for Assembly Notes

### Step 4: Connect Assembly Notes to Slack

1. **Open Assembly Notes** and go to **Settings**
2. **In the Slack Integration section**, click **"Connect to Slack"**
3. **This will open a browser window** to authorize the connection
4. **Grant permissions** and you'll see a success page
5. **Close the browser window** and return to Assembly Notes
6. **Select your preferred channels** where meeting summaries should be posted

> **Technical Note**: Assembly Notes creates a temporary local server (`localhost:3000`) to securely handle the OAuth callback. This is automatically managed and requires no additional setup.

### Step 5: Using Private Channels & Direct Messages (Optional)

**For Private Channels:**

1. **Invite the bot** to your private channel: `/invite @assembly-notes`
2. **Refresh channels** in Assembly Notes settings to see the private channel
3. **Select the private channel** as your preferred posting destination

**For Direct Messages:**

1. **The bot can send DMs** to any user in your workspace automatically
2. **Select a user** as your posting destination to receive private meeting summaries
3. **Meeting summaries** will be sent directly to that user's DMs

> **Note**: Assembly Notes can send meeting summaries directly to any user's DMs without prior conversation. This is perfect for sending personalized meeting notes or confidential summaries.

### Step 6: Test the Integration

1. **Start a recording** in Assembly Notes
2. **Say something** to generate a transcript
3. **Stop the recording** and click "Generate Summary"
4. **The AI-generated summary** will automatically post to your selected Slack channel (public or private)

### Troubleshooting

- **Connection Issues**: Make sure you're using the same workspace where you created the Slack app
- **Permission Errors**: Verify the bot has been added to the channels you want to post to, or use the `chat:write.public` scope
- **Private Channels Not Visible**: Make sure you've invited the bot (`/invite @assembly-notes`) and refreshed channels in Assembly Notes
- **DMs Not Working**: Ensure the bot has `im:write` permission to send direct messages
- **Missing Messages**: Check that the bot token is correctly configured in Assembly Notes settings
- **Private Channel Access Denied**: Ensure the bot has `groups:read` permission and has been invited to the specific private channel
- **User DM Access Issues**: Verify the bot has `users:read` permission to look up user information

### Security Notes

- **OAuth Flow**: Assembly Notes uses OAuth 2.0 for secure authentication
- **Token Storage**: Bot tokens are stored locally and encrypted in your system's user data directory
- **No Data Sharing**: Transcripts and summaries are only sent to your designated Slack channels
- **Open Source**: The entire OAuth implementation is open source and can be audited

For more technical details about the Slack integration, see the [SlackOAuthService](./src/main/services/slackOAuthService.ts) implementation.

## Environment Variables & Build Configuration

### Local Development

For local development with Slack integration, create a `.env` file in the project root:

```bash
# Copy the sample file
cp .env.sample .env
```

Then edit `.env` and add your Slack credentials:

```env
# Slack Integration (required for OAuth functionality)
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here

# Development options
DEV_MODE=true
NODE_ENV=development
```

Get your Slack credentials from:

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your app
3. Go to "Basic Information"
4. Copy the Client ID and Client Secret

### GitHub Actions & CI/CD

**For maintainers and forks**: To enable Slack integration in GitHub Actions builds, you need to set up repository secrets:

#### Required Repository Secrets

Go to your repository **Settings → Secrets and variables → Actions** and add:

| Secret Name           | Description             | How to Get                                     |
| --------------------- | ----------------------- | ---------------------------------------------- |
| `SLACK_CLIENT_ID`     | Slack app Client ID     | From your Slack app's "Basic Information" page |
| `SLACK_CLIENT_SECRET` | Slack app Client Secret | From your Slack app's "Basic Information" page |

#### Optional Repository Secrets (for macOS notarization)

| Secret Name                   | Description                                |
| ----------------------------- | ------------------------------------------ |
| `APPLE_ID`                    | Apple Developer account email              |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for notarization     |
| `APPLE_TEAM_ID`               | 10-character Team ID from Apple Developer  |
| `CSC_LINK`                    | Base64-encoded .p12 certificate (optional) |
| `CSC_KEY_PASSWORD`            | Certificate password (optional)            |

#### Why These Secrets Are Needed

- **Without Slack secrets**: Builds will succeed but Slack integration will be disabled (shows "not configured" message)
- **With Slack secrets**: Builds include full Slack OAuth functionality for end users
- **Production releases**: Should always include Slack secrets for complete functionality

#### Setting Up Secrets for Forks

If you fork this repository and want to maintain Slack integration:

1. **Create your own Slack app** following the setup guide above
2. **Add the secrets** to your forked repository
3. **GitHub Actions will automatically** use these secrets during builds
4. **Your builds will have** working Slack integration

#### Security Notes

- Repository secrets are **encrypted** and only accessible to GitHub Actions
- Secrets are **not exposed** in build logs or to pull requests from forks
- Each fork needs **its own Slack app** and secrets for security isolation
- The app uses **OAuth 2.0 flow** with localhost callback for secure authentication

## Architecture

### Core Technologies

- **Electron 37.2.4** - Desktop app framework using ES modules
- **TypeScript 5.8.3** - Strict type checking enabled
- **AssemblyAI SDK** - Real-time speech transcription with dual audio streams
- **Slack Web API** - Automated posting of meeting summaries
- **electron-audio-loopback** - System audio capture with echo cancellation
- **better-sqlite3** - High-performance SQLite database for settings and transcription history

### Process Architecture

- **Main Process** (`src/main/`) - Node.js backend handling audio processing, transcription, and Slack integration
- **Renderer Process** (`src/renderer/`) - Frontend UI with audio stream management
- **Preload Script** (`src/preload/`) - Secure IPC bridge between main and renderer processes

### Data Flow

1. **Audio Capture** - Simultaneous microphone and system audio recording
2. **Echo Cancellation** - Prevents feedback between microphone and system audio
3. **Real-time Transcription** - Dual AssemblyAI streams process audio independently
4. **Transcript Aggregation** - Combined transcripts from both audio sources
5. **AI Summarization** - Uses Claude (anthropic/claude-sonnet-4-20250514) via AssemblyAI Lemur
6. **Slack Integration** - Automated posting to configured Slack channels

## Release Process

### Fully Automated Releases

This project features a completely automated release pipeline:

#### **Simple Release Workflow**

1. **Make your changes and commit**:

   ```bash
   git add .
   git commit -m "Add awesome new feature"
   ```

2. **Release with one command**:

   ```bash
   # Patch release (1.0.40 → 1.0.41) - bug fixes
   npm run release:patch

   # Minor release (1.0.40 → 1.1.0) - new features
   npm run release:minor

   # Major release (1.0.40 → 2.0.0) - breaking changes
   npm run release:major
   ```

3. **GitHub Actions automatically**:
   - Runs TypeScript compilation and ESLint checks
   - Executes Jest unit tests and Playwright e2e tests
   - Builds the app for macOS, Windows, and Linux in parallel
   - Creates platform-specific installers (.dmg, .exe, .AppImage)
   - Generates release notes from conventional commit messages
   - Creates a GitHub release with downloadable assets
   - Makes the release available to users immediately

#### **Manual Build (if needed)**

For local testing or manual builds:

```bash
# Build for all platforms
npm run build

# Or build for specific platforms
npm run build:mac     # macOS DMG
npm run build:win     # Windows installer
npm run build:linux  # Linux AppImage
```

Built files will be in the `dist/` directory.

### Version Numbering

This project follows [Semantic Versioning](https://semver.org/):

- **Patch** (`v1.0.1`) - Bug fixes, small improvements
- **Minor** (`v1.1.0`) - New features, backward compatible
- **Major** (`v2.0.0`) - Breaking changes, major updates

## Development

### Code Quality

The project uses comprehensive code quality tools:

- **ESLint** - Strict TypeScript rules with type checking
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files only
- **Commitlint** - Validates conventional commit format

### Testing

- **Jest** - Unit tests with TypeScript support and mocks for Electron APIs
- **Playwright** - End-to-end testing for the full Electron application
- **Coverage** - Excludes entry points and UI-only files

### Important Development Notes

When making changes, ensure:

- TypeScript compilation passes (`npm run typecheck`)
- ESLint passes (`npm run lint`)
- Code is properly formatted (`npm run format`)
- Tests pass (`npm test`)
- Audio functionality is tested with both microphone and system audio

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style and conventions
4. Run `npm run fix` to format code and fix linting issues
5. Run `npm test` to ensure all tests pass
6. Commit your changes using conventional commit format
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License.
