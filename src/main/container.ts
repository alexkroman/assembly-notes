import { Store } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import 'reflect-metadata';
import { container } from 'tsyringe';

import { AutoUpdaterService } from './auto-updater.js';
import { DI_TOKENS } from './di-tokens.js';
import { DictationStatusWindow } from './dictationStatusWindow.js';
import logger from './logger.js';
import { AudioRecordingService } from './services/audioRecordingService.js';
import { DictationService } from './services/dictationService.js';
import { LLMGatewayService } from './services/llmGatewayService.js';
import { MigrationService } from './services/migrationService.js';
import { PostHogService } from './services/posthogService.js';
import { RecordingDataService } from './services/recordingDataService.js';
import { RecordingManager } from './services/recordingManager.js';
import { SettingsService } from './services/settingsService.js';
import { SummarizationService } from './services/summarizationService.js';
import { TranscriptFileService } from './services/transcriptFileService.js';
import {
  AssemblyAIFactory,
  TranscriptionService,
} from './services/transcriptionService.js';
import { StateBroadcaster } from './state-broadcaster.js';
import { store, type AppDispatch, type RootState } from './store/store.js';

export function setupContainer(mainWindow: BrowserWindow): void {
  // Register main window
  container.register(DI_TOKENS.MainWindow, {
    useValue: mainWindow,
  });

  // Register Redux store
  container.register<Store<RootState> & { dispatch: AppDispatch }>(
    DI_TOKENS.Store,
    {
      useValue: store,
    }
  );

  // Register logger
  container.register(DI_TOKENS.Logger, {
    useValue: logger,
  });

  // Register StateBroadcaster (must be registered before services that depend on it)
  container.registerSingleton(DI_TOKENS.StateBroadcaster, StateBroadcaster);

  // Register external dependencies
  container.register(DI_TOKENS.AssemblyAIFactory, {
    useClass: AssemblyAIFactory,
  });
  container.registerSingleton(DI_TOKENS.LLMGatewayService, LLMGatewayService);

  // Register services as singletons
  container.registerSingleton(DI_TOKENS.PostHogService, PostHogService);
  container.registerSingleton(
    DI_TOKENS.TranscriptFileService,
    TranscriptFileService
  );
  container.registerSingleton(DI_TOKENS.MigrationService, MigrationService);
  container.registerSingleton(DI_TOKENS.SettingsService, SettingsService);
  container.registerSingleton(
    DI_TOKENS.TranscriptionService,
    TranscriptionService
  );
  container.registerSingleton(
    DI_TOKENS.SummarizationService,
    SummarizationService
  );
  container.registerSingleton(
    DI_TOKENS.RecordingDataService,
    RecordingDataService
  );
  container.registerSingleton(DI_TOKENS.RecordingManager, RecordingManager);
  container.registerSingleton(DI_TOKENS.AutoUpdaterService, AutoUpdaterService);
  container.registerSingleton(DI_TOKENS.DictationService, DictationService);
  container.registerSingleton(
    DI_TOKENS.AudioRecordingService,
    AudioRecordingService
  );
  container.registerSingleton(
    DI_TOKENS.DictationStatusWindow,
    DictationStatusWindow
  );
}

export { DI_TOKENS, container };
