# Assembly Notes

Real-time meeting transcription and AI summaries for macOS, Windows, and Linux.

[![Latest Release](https://img.shields.io/github/v/release/alexkroman/assembly-notes?style=for-the-badge&logo=github)](https://github.com/alexkroman/assembly-notes/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

![Assembly Notes Meeting Demo](docs/screenshots/demo.gif)

_Record meetings with real-time transcription and AI summaries_

![Assembly Notes Dictating Demo](docs/screenshots/dictate.gif)

_Voice-to-text dictation with custom prompts_

## Features

### Meeting Recording

- **Dual audio capture** - Records microphone and system audio simultaneously
- **Real-time transcription** - Live speech-to-text via AssemblyAI
- **AI summaries** - Automatic meeting summaries with customizable prompts
- **Recording history** - Browse and search past meetings

### Dictation Mode

- **Voice-to-text** - Quick dictation with keyboard shortcut
- **Custom prompts** - Transform dictation with AI (e.g., "make professional", "fix grammar")
- **Clipboard integration** - Results copied automatically

### Privacy & Security

- **Local storage** - Transcripts stored as Markdown files on your machine
- **Encrypted credentials** - API keys secured with OS-level encryption
- **Sandboxed** - Runs in Electron's sandbox mode for security

## Download

| Platform              | Download                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| macOS (Apple Silicon) | [DMG](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-mac-arm64.dmg)     |
| macOS (Intel)         | [DMG](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-mac-x64.dmg)       |
| Windows               | [Installer](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-win-x64.exe) |
| Ubuntu/Debian (x64)   | [DEB](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-linux-x64.deb)     |
| Ubuntu/Debian (ARM64) | [DEB](https://github.com/alexkroman/assembly-notes/releases/latest/download/Assembly-Notes-linux-arm64.deb)   |

Other Linux distributions: Use [AppImage](https://github.com/alexkroman/assembly-notes/releases/latest)

## Quick Start

1. Download and install for your platform
2. Add your [AssemblyAI API key](https://www.assemblyai.com/) in Settings
3. Click **Start Recording** or use keyboard shortcuts

### Keyboard Shortcuts

| Action               | macOS         | Windows/Linux  |
| -------------------- | ------------- | -------------- |
| Start/Stop Recording | `Cmd+Shift+R` | `Ctrl+Shift+R` |
| Toggle Dictation     | `Cmd+Shift+D` | `Ctrl+Shift+D` |

## Configuration

### AssemblyAI (Required)

1. Sign up at [assemblyai.com](https://www.assemblyai.com/) (free tier available)
2. Copy your API key from the dashboard
3. Paste in Assembly Notes Settings

## Development

**Requirements:** Node.js 24+, npm 10+

```bash
git clone https://github.com/alexkroman/assembly-notes.git
cd assembly-notes
npm install
npm start
```

### Commands

```bash
# Development
npm start              # Build and start app
npm run dev            # Watch mode with hot reload
npm run start:fresh    # Start with fresh state

# Testing
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report

# Code Quality
npm run lint           # ESLint check
npm run format         # Prettier format
npm run typecheck      # TypeScript check
npm run fix            # Auto-fix lint + format

# Building
npm run build:mac      # macOS DMG
npm run build:win      # Windows installer
npm run build:linux    # Linux AppImage/DEB
```

### Tech Stack

- **Electron** - Cross-platform desktop framework
- **TypeScript** - Type-safe JavaScript
- **React** - UI components
- **Redux Toolkit** - State management
- **AssemblyAI SDK** - Real-time transcription
- **Vite** - Fast build tooling
- **tsyringe** - Dependency injection

### Data Storage

Transcripts are stored as Markdown files with YAML frontmatter:

```
{userData}/
├── config.json          # Settings (electron-store)
├── transcripts/
│   ├── 2024-01-15_team-standup.md
│   ├── 2024-01-16_client-call.md
│   └── ...
└── recordings/
    └── {id}.wav         # Audio files
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Ensure tests pass: `npm test`
5. Commit with a clear message
6. Push and open a Pull Request

## License

MIT - see [LICENSE](LICENSE)
