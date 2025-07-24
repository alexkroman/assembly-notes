# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Assembly Notes is an Electron desktop application for real-time transcription and meeting note-taking. It records both microphone input and system audio (Zoom calls, music, etc.), transcribes in real-time using AssemblyAI, and automatically posts AI-generated summaries to Slack channels.

## Development Commands

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

## Architecture

### Core Technologies

- **Electron 35.0.0** - Desktop app framework using ES6 modules
- **AssemblyAI SDK** - Real-time speech transcription with dual audio streams
- **Slack Web API** - Automated posting of meeting summaries
- **electron-audio-loopback** - System audio capture with echo cancellation

### Process Architecture

- **Main Process** (`src/main/`) - Node.js backend handling audio processing, transcription, and Slack integration
- **Renderer Process** (`src/renderer/`) - Frontend UI with audio stream management
- **Preload Script** (`src/preload/`) - Secure IPC bridge between main and renderer processes

### Key Files

**Main Process:**

- `main.js` - Entry point, creates Electron window, initializes audio loopback
- `transcription.js` - Core transcription logic with dual AssemblyAI streams (microphone + system audio)
- `slack.js` - Slack integration for posting meeting summaries
- `settings.js` - Persistent settings management in userData directory
- `ipc-handlers.js` - Inter-process communication handlers

**Renderer Process:**

- `index.html` - Main UI with dark theme and settings modal
- `renderer.js` - Frontend logic and UI interactions
- `audio-processing.js` - Audio data processing and streaming
- `echo-cancellation.js` - Audio echo cancellation to prevent feedback loops

### Data Flow

1. **Audio Capture** - Simultaneous microphone and system audio recording
2. **Echo Cancellation** - Prevents feedback between microphone and system audio
3. **Real-time Transcription** - Dual AssemblyAI streams process audio independently
4. **Transcript Aggregation** - Combined transcripts from both audio sources
5. **AI Summarization** - Uses Claude (anthropic/claude-sonnet-4-20250514) via AssemblyAI Lemur
6. **Slack Integration** - Automated posting to configured Slack channels

### Settings Management

Settings are persisted to `userData/settings.json` and include:

- AssemblyAI API key
- Slack bot token and channel configuration
- Custom summary prompts
- Audio processing preferences

### Build Configuration

Uses electron-builder for cross-platform packaging with platform-specific outputs:

- macOS: DMG installer (Productivity category)
- Windows: NSIS installer
- Linux: AppImage

## Development Notes

The codebase uses modern JavaScript (ES2022) with ES modules throughout. ESLint is configured for Node.js and browser environments with custom rules favoring const declarations and allowing console usage for debugging.

Audio processing involves complex coordination between microphone capture, system audio loopback, echo cancellation, and dual transcription streams - test audio functionality thoroughly when making changes.
