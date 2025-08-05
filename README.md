# Assembly Notes

![Assembly Notes Screenshot](docs/screenshots/screenshot.gif)

Real-time meeting transcription and AI-powered summaries. Captures both microphone and system audio, transcribes with AssemblyAI, and posts summaries to Slack.

## ✨ Key Features

- **Dual Audio Capture** - Records microphone and system audio simultaneously
- **Real-time Transcription** - Live speech-to-text with AssemblyAI
- **AI Summaries** - Claude-powered meeting summaries via AssemblyAI Lemur
- **Slack Integration** - Automatic posting to channels or DMs
- **Cross-platform** - Works on macOS, Windows, and Linux

## 📥 Download

[![Latest Release](https://img.shields.io/github/v/release/alexkroman/assembly-notes?style=for-the-badge&logo=github)](https://github.com/alexkroman/assembly-notes/releases/latest)

| Platform                  | Download                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **macOS** (Apple Silicon) | [Download DMG](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-mac-arm64.dmg)       |
| **macOS** (Intel)         | [Download DMG](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-mac-x64.dmg)         |
| **Windows**               | [Download ZIP](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-win-x64.zip)         |
| **Linux**                 | [Download TAR.GZ](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-linux-x64.tar.gz) |

## 🚀 Quick Start

### For Users

1. Download the app for your platform
2. Open Assembly Notes
3. Go to Settings and add your AssemblyAI API key
4. (Optional) Set up Slack integration for automatic posting
5. Click "Start Recording" to begin transcribing!

### For Developers

```bash
# Clone and install
git clone https://github.com/alexkroman/assembly-notes.git
cd assembly-notes
npm install

# Run in development
npm start
```

## 🔧 Configuration

### Required: AssemblyAI API Key

Get your free API key at [assemblyai.com](https://www.assemblyai.com/) and add it in Settings.

### Optional: Slack Integration

Post summaries automatically to Slack:

1. Create a Slack app using our [manifest](./slack-app-manifest.json)
2. Get your Client ID and Secret from Slack
3. Enter credentials in Assembly Notes Settings
4. Click "Connect to Slack"
5. Choose channels for posting summaries

[Detailed Slack setup guide →](#slack-integration-setup)

## 🛠️ Development

### Commands

```bash
# Development
npm start              # Start the app
npm run dev            # Start with hot reload
npm run test           # Run all tests

# Building
npm run build:mac      # Build for macOS
npm run build:win      # Build for Windows
npm run build:linux    # Build for Linux

# Releases
npm run release:patch  # Bug fixes (1.0.0 → 1.0.1)
npm run release:minor  # New features (1.0.0 → 1.1.0)
npm run release:major  # Breaking changes (1.0.0 → 2.0.0)
```

### Tech Stack

- **Electron 37.2.4** - Desktop framework
- **TypeScript 5.8.3** - Type-safe JavaScript
- **React 19.1.1** - UI components
- **AssemblyAI SDK** - Transcription service
- **SQLite** - Local data storage

## 📋 Slack Integration Setup

<details>
<summary>Click for detailed setup instructions</summary>

### Step 1: Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From an app manifest"
3. Choose your workspace
4. Copy contents of [`slack-app-manifest.json`](./slack-app-manifest.json)
5. Paste and create the app

### Step 2: Get Credentials

1. Go to "Basic Information"
2. Find your **Client ID** and **Client Secret**
3. Copy both values

### Step 3: Connect Assembly Notes

1. Open Assembly Notes → Settings
2. Enter your Slack credentials
3. Click "Connect to Slack"
4. Authorize in your browser
5. Select channels for posting

### Using Private Channels & DMs

**Private Channels:**

- Invite the bot: `/invite @assembly-notes`
- Refresh channels in settings

**Direct Messages:**

- Select any user as destination
- No invitation needed

</details>

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests with `npm test`
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
