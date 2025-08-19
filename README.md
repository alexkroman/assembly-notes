# Assembly Notes

<div align="center">

**Real-time meeting transcription and AI-powered summaries**

Capture both microphone and system audio, transcribe with AssemblyAI, and automatically post intelligent summaries to Slack.

[![Latest Release](https://img.shields.io/github/v/release/alexkroman/assembly-notes?style=for-the-badge&logo=github)](https://github.com/alexkroman/assembly-notes/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=for-the-badge)](https://github.com/alexkroman/assembly-notes/releases/latest)
[![Node.js](https://img.shields.io/badge/Node.js-24.0.0+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

[Download Latest Release](https://github.com/alexkroman/assembly-notes/releases/latest) • [Report Bug](https://github.com/alexkroman/assembly-notes/issues) • [Request Feature](https://github.com/alexkroman/assembly-notes/issues)

</div>

## 📸 Demos

<div align="center">

### Meeting Transcription & AI Summaries

![Assembly Notes Meeting Demo](docs/screenshots/demo.gif)

_Record meetings, get real-time transcription, and automatically generate AI-powered summaries posted to Slack_

### Real-Time Dictation

![Assembly Notes Dictating Demo](docs/screenshots/dictate.gif)

_Use voice-to-text for instant dictation with customizable AI prompts and smart formatting_

</div>

## ✨ Key Features

### 🎤 Meeting Transcription & Summaries

- **Dual Audio Capture** - Records microphone and system audio simultaneously
- **Real-time Transcription** - Live speech-to-text with AssemblyAI's advanced models
- **AI Summaries** - Claude-powered meeting summaries via AssemblyAI Lemur
- **Slack Integration** - Automatic posting to channels or direct messages
- **Smart Prompts** - Customizable AI prompts for tailored summaries

### 🎙️ Real-Time Dictation

- **Instant Voice-to-Text** - Speak and see your words appear in real-time
- **Customizable Prompts** - Set context-specific prompts for different types of content
- **Smart Formatting** - AI-powered text formatting and structure
- **Floating Window** - Dedicated dictation interface that stays on top
- **Hotkey Support** - Quick start/stop with customizable keyboard shortcuts

### 🔧 Platform & Privacy

- **Cross-platform** - Native apps for macOS, Windows, and Linux
- **Local Storage** - All recordings and transcriptions stored locally
- **Privacy First** - No data sent to third parties except AssemblyAI for transcription
- **Modern UI** - Clean, intuitive interface built with React and Tailwind CSS

## 📥 Download

Download the latest version for your platform:

| Platform                  | Download                                                                                                               | Size   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| **macOS** (Apple Silicon) | [Download DMG](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-mac-arm64.dmg)     | ~150MB |
| **macOS** (Intel)         | [Download DMG](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-mac-x64.dmg)       | ~150MB |
| **Windows**               | [Download Installer](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-win-x64.exe) | ~150MB |
| **Ubuntu/Debian** (x64)   | [DEB Package](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-linux-x64.deb)      | ~150MB |
| **Ubuntu/Debian** (ARM64) | [DEB Package](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-linux-arm64.deb)    | ~150MB |

> 💡 **Note**: For other Linux distributions, you can use the AppImage files available in the [releases page](https://github.com/alexkroman/assembly-notes/releases/latest).

## 🚀 Quick Start

### For End Users

1. **Download** the app for your platform from the table above
2. **Install**:
   - **Ubuntu/Debian**:
     ```bash
     sudo dpkg -i Assembly-Notes-linux-*.deb
     sudo apt-get install -f  # Fix any missing dependencies
     ```
   - **macOS**: Open the DMG and drag to Applications
   - **Windows**: Run the installer
   - **Other Linux**: Make AppImage executable with `chmod +x` and run
3. **Configure** your AssemblyAI API key in Settings
4. **Optional**: Set up Slack integration for automatic posting
5. **Choose Your Workflow**:
   - **🎤 Meeting Recording**: Start recording to transcribe meetings and generate summaries
   - **🎙️ Dictation**: Use the dictation feature for real-time voice-to-text with custom prompts

### For Developers

```bash
# Clone the repository
git clone https://github.com/alexkroman/assembly-notes.git
cd assembly-notes

# Install dependencies
npm install

# Start in development mode
npm start
```

## 🔧 Configuration

### Required: AssemblyAI API Key

Assembly Notes uses AssemblyAI for high-quality transcription and AI summarization:

1. Sign up for a free account at [assemblyai.com](https://www.assemblyai.com/)
2. Get your API key from the dashboard
3. Add the key in Assembly Notes Settings

> 💡 **Free Tier**: AssemblyAI offers free transcription credits for new users.

### Optional: Slack Integration

Automatically post meeting summaries to your Slack workspace:

1. Create a Slack app using our [manifest](./slack-app-manifest.json)
2. Get your Client ID and Secret from Slack
3. Enter credentials in Assembly Notes Settings
4. Click "Connect to Slack"
5. Choose channels for posting summaries

📖 **[Detailed Slack setup guide →](#slack-integration-setup)**

### 🎙️ Dictation Setup

Configure your dictation experience:

1. **Set Custom Prompts**: Create context-specific prompts for different types of content
2. **Configure Hotkeys**: Set up keyboard shortcuts for quick dictation start/stop
3. **Adjust Settings**: Fine-tune audio input and transcription preferences
4. **Floating Window**: Use the dedicated dictation interface for distraction-free writing

## 🛠️ Development

### Prerequisites

- **Node.js** 24.0.0 or higher
- **npm** 10.0.0 or higher
- **Git**

### Available Commands

```bash
# Development
npm start              # Start the app
npm run dev            # Start with hot reload
npm run test           # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:e2e       # Run end-to-end tests

# Building
npm run build:mac        # Build for macOS
npm run build:win        # Build for Windows
npm run build:linux       # Build for Linux x64 (AppImage + DEB)
npm run build:linux:x64   # Build for Linux x64 (AppImage + DEB)
npm run build:linux:arm64 # Build for Linux ARM64 (AppImage + DEB)
npm run build:all        # Build for all platforms

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
npm run typecheck       # Run TypeScript type checking

# Releases
npm run release:patch  # Bug fixes (1.0.0 → 1.0.1)
npm run release:minor  # New features (1.0.0 → 1.1.0)
npm run release:major  # Breaking changes (1.0.0 → 2.0.0)
```

### Tech Stack

- **Electron** - Cross-platform desktop framework
- **TypeScript** - Type-safe JavaScript development
- **React** - Modern UI components
- **AssemblyAI SDK** - Professional transcription service
- **SQLite** - Local data storage
- **Redux Toolkit** - State management
- **Tailwind CSS** - Utility-first styling
- **Jest & Playwright** - Testing framework
- **Vite** - Build tool and dev server

### Project Structure

```
assembly-notes/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React UI components
│   ├── preload/        # Electron preload scripts
│   └── types/          # TypeScript type definitions
├── __tests__/          # Test files
├── scripts/            # Build and utility scripts
└── docs/              # Documentation and screenshots
```

## 📋 Slack Integration Setup

<details>
<summary>📖 Click for detailed setup instructions</summary>

### Step 1: Create Slack App

1. Navigate to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From an app manifest"
3. Select your workspace
4. Copy the contents of [`slack-app-manifest.json`](./slack-app-manifest.json)
5. Paste the manifest and create the app

### Step 2: Get Credentials

1. Go to "Basic Information" in your Slack app
2. Locate your **Client ID** and **Client Secret**
3. Copy both values for use in Assembly Notes

### Step 3: Connect Assembly Notes

1. Open Assembly Notes and go to Settings
2. Enter your Slack credentials (Client ID and Secret)
3. Click "Connect to Slack"
4. Authorize the app in your browser
5. Select channels for automatic summary posting

### Using Private Channels & DMs

**Private Channels:**

- Invite the bot: `/invite @assembly-notes`
- Refresh the channels list in settings

**Direct Messages:**

- Select any user as the destination
- No invitation required

</details>

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** your changes with `npm test`
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style and TypeScript conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Use conventional commit messages
- Keep PRs focused and well-described

### Areas for Contribution

- 🐛 **Bug fixes** - Help squash bugs and improve stability
- ✨ **New features** - Add functionality that users need
- 📚 **Documentation** - Improve docs, add examples, fix typos
- 🧪 **Testing** - Add tests, improve test coverage
- 🎨 **UI/UX** - Enhance the user interface and experience
- 🔧 **Performance** - Optimize performance and reduce resource usage

## 🐛 Troubleshooting

### Common Issues

**Audio not recording:**

- Check microphone permissions in your OS settings
- Ensure the correct audio input device is selected
- Try restarting the application

**Transcription not working:**

- Verify your AssemblyAI API key is correct
- Check your internet connection
- Ensure you have sufficient AssemblyAI credits

**Dictation issues:**

- Check microphone permissions in your OS settings
- Ensure the correct audio input device is selected
- Try restarting the dictation window
- Verify your custom prompts are properly configured

**Slack integration issues:**

- Verify your Slack app credentials
- Check that the bot has been invited to private channels
- Ensure the app has the necessary permissions

### Getting Help

- 📖 Check the [documentation](#) (coming soon)
- 🐛 [Report a bug](https://github.com/alexkroman/assembly-notes/issues)
- 💡 [Request a feature](https://github.com/alexkroman/assembly-notes/issues)
- 💬 [Start a discussion](https://github.com/alexkroman/assembly-notes/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- All our [contributors](https://github.com/alexkroman/assembly-notes/graphs/contributors) who help make this project better
