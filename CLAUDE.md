# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Assembly Notes is an Electron desktop application for real-time transcription and meeting note-taking. It records both microphone input and system audio (Zoom calls, music, etc.), transcribes in real-time using AssemblyAI, and automatically posts AI-generated summaries to Slack channels.

## Development Commands

```bash
# Development
npm start              # Build TypeScript and start Electron app
npm run start:fresh    # Start with fresh state (clears cache)
npm run dev            # Run TypeScript in watch mode with Electron
npm run build:all      # Compile all TypeScript (main, preload, renderer)
npm run build:main     # Compile main process TypeScript only
npm run build:preload  # Compile preload script via Vite
npm run build:renderer # Compile renderer via Vite + React
npm run typecheck      # Type check without emitting files

# Code Quality
npm run lint           # Run ESLint code analysis with type checking
npm run lint:fix       # Fix auto-fixable ESLint issues
npm run format         # Format code with Prettier
npm run fix            # Run both lint:fix and format

# Git Hooks (Husky)
# Pre-commit: Automatically runs lint-staged (ESLint + Prettier on staged files) + TypeScript check
# Commit-msg: Validates commit messages follow conventional commit format
# Pre-push: Runs all tests before pushing to ensure code quality

# Testing
npm test               # Run all tests (Jest unit tests + Playwright e2e)
npm run test:watch     # Run Jest tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run test:e2e       # Run Playwright end-to-end tests only

# Single test execution examples:
# npx jest __tests__/main/database.test.ts
# npx playwright test __tests__/e2e/app-startup.test.ts

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
```

## Architecture

### Core Technologies

- **Electron 37.2.4** - Desktop app framework using ES modules
- **TypeScript 5.8.3** - Strict type checking enabled with ES2022 target
- **React 19.1.1** - Modern React with hooks for renderer UI
- **Vite** - Fast build tool for renderer and preload scripts
- **Redux Toolkit** - State management with electron-redux for IPC synchronization
- **tsyringe** - Dependency injection container for main process services
- **AssemblyAI SDK** - Real-time speech transcription with dual audio streams
- **Slack Web API** - Automated posting of meeting summaries (via @slack/web-api)
- **electron-audio-loopback** - System audio capture with echo cancellation
- **better-sqlite3** - High-performance SQLite database for settings and transcription history

### Process Architecture

- **Main Process** (`src/main/`) - Node.js backend with dependency injection (tsyringe), Redux store, and service layer
- **Renderer Process** (`src/renderer/`) - React-based UI with Redux state management and Web Audio API
- **Preload Script** (`src/preload/`) - Secure IPC bridge with typed API surface and electron-redux integration

### Build System

- **Main Process**: TypeScript compiler (tsc) targeting ES2022 with strict settings
- **Renderer Process**: Vite + React plugin with PostCSS and Tailwind CSS support
- **Preload Script**: Vite in library mode generating CommonJS for Electron compatibility
- **Asset Copying**: Custom Vite plugin copies CSS assets to dist directory
- **Native Modules**: electron-builder unpacks native modules (electron-audio-loopback, better-sqlite3)

### Key Files

**Main Process:**

- `main.ts` - Entry point, creates Electron window, initializes audio loopback, sets up DI container
- `container.ts` - Dependency injection setup using tsyringe with all service registrations
- `services/transcriptionService.ts` - Core transcription logic with dual AssemblyAI streams (microphone + system audio)
- `services/recordingManager.ts` - Manages recording state and audio stream coordination
- `services/settingsService.ts` - Settings management with SQLite persistence
- `services/slackService.ts` - Slack integration for posting summaries
- `database.ts` - SQLite database service for settings and transcription history storage
- `ipc-handlers.ts` - Inter-process communication handlers with typed responses
- `auto-updater.ts` - Auto-update functionality using electron-updater
- `store/store.ts` - Redux store with electron-redux state synchronization
- `logger.ts` - Logging utility using electron-log

**Renderer Process:**

- `index.html` - Main UI entry point
- `main.tsx` - React root component with Redux provider
- `components/App.tsx` - Main application component with routing and state management
- `components/` - React components (SettingsModal, ChannelModal, PromptModal, RecordingView, RecordingsList)
- `hooks/` - Custom React hooks (useRecording, useChannels, usePrompts, redux hooks)
- `audio-processing.ts` - Audio worklet management for streaming
- `audio-processor.ts` - AudioWorkletProcessor for real-time audio processing
- `echo-cancellation.ts` - Audio echo cancellation to prevent feedback loops
- `media.ts` - Media stream acquisition and management
- `store.ts` - Renderer Redux store configuration with electron-redux sync

### Data Flow

1. **Audio Capture** - Simultaneous microphone and system audio recording
2. **Echo Cancellation** - Prevents feedback between microphone and system audio
3. **Real-time Transcription** - Dual AssemblyAI streams process audio independently
4. **Transcript Aggregation** - Combined transcripts from both audio sources
5. **AI Summarization** - Uses Claude (anthropic/claude-sonnet-4-20250514) via AssemblyAI Lemur
6. **Slack Integration** - Automated posting to configured Slack channels

### Settings Management

Settings are persisted using SQLite database and include:

- AssemblyAI API key
- Slack bot token and channel configuration
- Custom summary prompts
- Audio processing preferences (keep-alive settings)

### Build Configuration

Uses electron-builder for cross-platform packaging:

- macOS: DMG installer with code signing and notarization support
- Windows: NSIS installer
- Linux: AppImage
- Assets are unpacked for native modules (electron-audio-loopback)

## Development Notes

### TypeScript Configuration

The project uses strict TypeScript configuration with:

- Strict mode enabled with all checks
- ES2022 target with ESNext modules
- Separate tsconfig for preload scripts
- Type roots include custom types directory

### Testing Strategy

- **Unit Tests**: Jest with TypeScript support and jsdom environment for React components
- **Mocking**: Comprehensive mocks in `__mocks__/` for Electron APIs (electron, electron-log, assemblyai, etc.)
- **E2E Tests**: Playwright configured for Electron with increased timeouts (60s) and serial execution
- **Coverage**: Excludes preload entry point and media.ts, includes all src/ TypeScript files
- **Test Structure**:
  - `__tests__/main/` - Main process unit tests
  - `__tests__/renderer/` - React component tests
  - `__tests__/e2e/` - End-to-end Playwright tests
  - `__tests__/setup.ts` - Global test setup with reflect-metadata and mocked globals

### Code Quality

ESLint configuration enforces:

- Strict TypeScript rules with type checking
- Import ordering and organization
- No explicit any types (except in tests)
- Console usage restricted to warn/error
- Different rules for main/renderer/preload contexts

### Important Patterns

1. **IPC Communication**: All communication between main and renderer uses typed IPC handlers in preload script
2. **Dependency Injection**: Main process uses tsyringe for service registration and dependency resolution
3. **State Management**: Redux with electron-redux for synchronized state between main and renderer processes
4. **Audio Processing**: Uses Web Audio API with AudioWorklet for efficient streaming with echo cancellation
5. **Error Handling**: Comprehensive error logging with electron-log, exposed to renderer via contextBridge
6. **Type Safety**: Strict TypeScript configuration with comprehensive type definitions in `src/types/`
7. **Dual Audio Streams**: Separate AssemblyAI transcription instances for microphone and system audio
8. **React Patterns**: Functional components with hooks, custom hooks for business logic abstraction

## Development Workflow

### Multi-Configuration TypeScript Setup

The project uses multiple TypeScript configurations:

- `tsconfig.json` - Main configuration with strictest settings (ES2022, all strict checks enabled)
- `tsconfig.preload.json` - Preload script configuration
- `tsconfig.test.json` - Test environment configuration with JSX support
- `tsconfig.mocks.json` - Mock files configuration

### Build Process Details

1. **Main Process**: Direct TypeScript compilation to `dist/main/`
2. **Preload Script**: Vite builds to CommonJS format in `dist/preload/`
3. **Renderer Process**: Vite + React builds to `dist/renderer/` with asset copying
4. **Native Dependencies**: Automatic rebuilding via electron-rebuild in postinstall

### Key Development Notes

- **Dependency Injection**: Services are registered in `container.ts` and resolved throughout the main process
- **State Synchronization**: Redux state automatically syncs between main and renderer via electron-redux
- **IPC Type Safety**: All IPC methods are typed in preload script and exported via contextBridge
- **Mock Strategy**: Comprehensive mocks mirror real API surfaces for reliable testing
- **Audio Worklets**: Custom AudioWorkletProcessor handles real-time audio data streaming

When making changes, ensure:

- TypeScript compilation passes (`npm run typecheck`)
- ESLint passes (`npm run lint`)
- Tests pass (`npm test`)
- Audio functionality is tested with both microphone and system audio
- Native module rebuilds complete successfully (`npm run postinstall`)
