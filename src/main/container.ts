import { Store } from '@reduxjs/toolkit';
import { BrowserWindow } from 'electron';
import 'reflect-metadata';
import { container } from 'tsyringe';

import { AutoUpdaterService } from './auto-updater.js';
import { DatabaseService } from './database.js';
import { DI_TOKENS } from './di-tokens.js';
import { DictationStatusWindow } from './dictationStatusWindow.js';
import logger from './logger.js';
import { AudioRecordingService } from './services/audioRecordingService.js';
import { DictationService } from './services/dictationService.js';
import { RecordingDataService } from './services/recordingDataService.js';
import { RecordingManager } from './services/recordingManager.js';
import { SettingsService } from './services/settingsService.js';
import {
  SlackIntegrationService,
  FetchHttpClient,
} from './services/slackIntegrationService.js';
import {
  AssemblyAIFactoryWithLemur,
  SummarizationService,
} from './services/summarizationService.js';
import {
  AssemblyAIFactory,
  TranscriptionService,
} from './services/transcriptionService.js';
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

  // Register external dependencies
  container.register(DI_TOKENS.AssemblyAIFactory, {
    useClass: AssemblyAIFactory,
  });
  container.register(DI_TOKENS.AssemblyAIFactoryWithLemur, {
    useClass: AssemblyAIFactoryWithLemur,
  });
  container.register(DI_TOKENS.HttpClient, {
    useClass: FetchHttpClient,
  });

  // Register services as singletons
  container.registerSingleton(DI_TOKENS.DatabaseService, DatabaseService);
  container.registerSingleton(DI_TOKENS.SettingsService, SettingsService);
  container.registerSingleton(
    DI_TOKENS.SlackIntegrationService,
    SlackIntegrationService
  );
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
  container.registerSingleton(DI_TOKENS.AudioRecordingService, AudioRecordingService);
  container.registerSingleton(DI_TOKENS.DictationStatusWindow, DictationStatusWindow);
}

export { DI_TOKENS, container };
