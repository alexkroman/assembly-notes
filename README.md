# Assembly Notes

A desktop application for real-time transcription and meeting note-taking. Records both microphone input and system audio (Zoom calls, music, etc.), transcribes in real-time using AssemblyAI, and automatically posts AI-generated summaries to Slack channels.

## Features

- **Real-time Transcription**: Dual audio stream processing (microphone + system audio)
- **Echo Cancellation**: Prevents feedback between microphone and system audio
- **AI Summarization**: Uses Claude AI to generate meeting summaries
- **Slack Integration**: Automatically posts summaries to configured Slack channels
- **Cross-platform**: Supports macOS, Windows, and Linux

## Installation

### Download Latest Release

[![Latest Release](https://img.shields.io/github/v/release/alexkroman-assembly/assembly-notes?style=for-the-badge&logo=github)](https://github.com/alexkroman-assembly/assembly-notes/releases/latest)

**[📥 Download Latest Release](https://github.com/alexkroman-assembly/assembly-notes/releases/latest)**

Choose your platform:

- **macOS**: Download the `.dmg` file
- **Windows**: Download the `.exe` installer
- **Linux**: Download the `.AppImage` file

> **Note**: All releases are automatically built and tested via GitHub Actions. Visit the [releases page](https://github.com/alexkroman-assembly/assembly-notes/releases) to see all available versions.

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/alexkroman-assembly/assembly-notes.git
cd assembly-notes

# Install dependencies
npm install

# Start the development app
npm start
```

### Available Scripts

```bash
npm start              # Start the Electron app for development
npm run lint           # Run ESLint code analysis
npm run format         # Format code with Prettier
npm run build          # Build for all platforms (macOS, Windows, Linux)
npm run build:mac      # Build DMG for macOS
npm run build:win      # Build NSIS installer for Windows
npm run build:linux    # Build AppImage for Linux
npm run pack           # Package without distributing
```

## Configuration

1. **AssemblyAI API Key**: Required for transcription services
2. **Slack Bot Token**: Required for posting summaries to Slack channels
3. **Custom Summary Prompts**: Customize AI-generated summaries

Settings are stored in your system's user data directory and persist between app sessions.

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
   # Patch release (1.0.0 → 1.0.1) - bug fixes
   npm run release:patch

   # Minor release (1.0.0 → 1.1.0) - new features
   npm run release:minor

   # Major release (1.0.0 → 2.0.0) - breaking changes
   npm run release:major
   ```

3. **GitHub Actions automatically**:
   - Runs linting checks to ensure code quality
   - Builds the app for macOS, Windows, and Linux in parallel
   - Creates platform-specific installers (.dmg, .exe, .AppImage)
   - Generates release notes from your commit messages
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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
