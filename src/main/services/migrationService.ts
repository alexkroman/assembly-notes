import fs from 'fs';
import path from 'path';

import Database from 'better-sqlite3';
import { app } from 'electron';
import { inject, injectable } from 'tsyringe';

import type { PromptTemplate, Recording } from '../../types/common.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';
import { settingsStore, type SettingsStoreSchema } from '../settings-store.js';
import { TranscriptFileService } from './transcriptFileService.js';

/**
 * Migration service that handles one-time export of data from SQLite
 * to electron-store (settings) and markdown files (transcripts)
 */
@injectable()
export class MigrationService {
  private dbPath: string;

  constructor(
    @inject(DI_TOKENS.Logger) private logger: typeof Logger,
    @inject(DI_TOKENS.TranscriptFileService)
    private transcriptFileService: TranscriptFileService
  ) {
    const userData = app.getPath('userData');
    this.dbPath = path.join(userData, 'assembly-notes.db');
  }

  /**
   * Check if the SQLite database exists
   */
  private databaseExists(): boolean {
    return fs.existsSync(this.dbPath);
  }

  /**
   * Check if migration has already been completed
   */
  isMigrationCompleted(): boolean {
    return settingsStore.get('migrationCompleted');
  }

  /**
   * Mark migration as completed
   */
  private setMigrationCompleted(): void {
    settingsStore.set('migrationCompleted', true);
  }

  /**
   * Run the migration if needed
   * Returns true if migration was successful or not needed
   */
  async runMigrationIfNeeded(): Promise<boolean> {
    // Check if already migrated
    if (this.isMigrationCompleted()) {
      this.logger.info('Migration already completed, skipping');
      return true;
    }

    // Check if SQLite database exists
    if (!this.databaseExists()) {
      this.logger.info('No SQLite database found, treating as fresh install');
      this.setMigrationCompleted();
      return true;
    }

    this.logger.info('Starting migration from SQLite to file-based storage');

    try {
      // Open SQLite database for reading
      const db = new Database(this.dbPath, { readonly: true });

      try {
        // Migrate settings
        this.migrateSettings(db);

        // Migrate recordings
        await this.migrateRecordings(db);

        // Mark migration as complete
        this.setMigrationCompleted();
        this.logger.info('Migration completed successfully');

        return true;
      } finally {
        db.close();
      }
    } catch (error) {
      this.logger.error('Migration failed:', error);
      // Don't mark as complete so we can retry
      return false;
    }
  }

  /**
   * Migrate settings from SQLite to electron-store
   */
  private migrateSettings(db: Database.Database): void {
    this.logger.info('Migrating settings...');

    try {
      const stmt = db.prepare('SELECT key, value FROM settings');
      const rows = stmt.all() as { key: string; value: string }[];

      for (const row of rows) {
        try {
          // Skip migrating if we already have a non-empty value
          const existingValue = settingsStore.get(
            row.key as keyof SettingsStoreSchema
          );
          if (
            existingValue !== '' &&
            existingValue !== false &&
            existingValue !== 0
          ) {
            this.logger.debug(`Skipping ${row.key} - already has value`);
            continue;
          }

          // Parse the value
          let value: unknown;
          try {
            value = JSON.parse(row.value);
          } catch {
            value = row.value;
          }

          // Map known settings to electron-store
          switch (row.key) {
            case 'assemblyaiKey':
              if (typeof value === 'string' && value) {
                settingsStore.set('assemblyaiKey', value);
              }
              break;
            case 'summaryPrompt':
              if (typeof value === 'string' && value) {
                settingsStore.set('summaryPrompt', value);
              }
              break;
            case 'prompts':
              if (Array.isArray(value)) {
                settingsStore.set('prompts', value as PromptTemplate[]);
              }
              break;
            case 'autoStart':
              settingsStore.set('autoStart', Boolean(value));
              break;
            case 'userId':
              if (typeof value === 'string' && value) {
                settingsStore.set('userId', value);
              }
              break;
            case 'dictationStylingPrompt':
              if (typeof value === 'string' && value) {
                settingsStore.set('dictationStylingPrompt', value);
              }
              break;
            default:
              this.logger.debug(`Skipping unknown setting: ${row.key}`);
          }
        } catch (error) {
          this.logger.warn(`Error migrating setting ${row.key}:`, error);
        }
      }

      this.logger.info(`Migrated settings from SQLite`);
    } catch (error) {
      this.logger.warn(
        'Could not migrate settings (table may not exist):',
        error
      );
    }
  }

  /**
   * Migrate recordings from SQLite to markdown files
   */
  private async migrateRecordings(db: Database.Database): Promise<void> {
    this.logger.info('Migrating recordings...');

    try {
      const stmt = db.prepare(
        'SELECT id, title, transcript, summary, audio_filename, created_at, updated_at FROM recordings ORDER BY created_at DESC'
      );
      const recordings = stmt.all() as Recording[];

      let migrated = 0;
      let skipped = 0;

      for (const recording of recordings) {
        try {
          // Check if already migrated (file exists with same ID)
          const exists = await this.transcriptFileService.transcriptExists(
            recording.id
          );
          if (exists) {
            this.logger.debug(
              `Recording ${recording.id} already migrated, skipping`
            );
            skipped++;
            continue;
          }

          // Save to markdown file
          const transcriptRecord: Parameters<
            typeof this.transcriptFileService.saveTranscript
          >[0] = {
            id: recording.id,
            title: recording.title ?? 'Untitled',
            transcript: recording.transcript ?? '',
            summary: recording.summary ?? '',
            created_at: recording.created_at,
            updated_at: recording.updated_at,
          };

          if (recording.audio_filename) {
            transcriptRecord.audio_filename = recording.audio_filename;
          }

          const filename =
            await this.transcriptFileService.saveTranscript(transcriptRecord);

          this.logger.debug(
            `Migrated recording ${recording.id} to ${filename}`
          );
          migrated++;
        } catch (error) {
          this.logger.error(
            `Error migrating recording ${recording.id}:`,
            error
          );
          // Continue with other recordings
        }
      }

      this.logger.info(
        `Migrated ${String(migrated)} recordings, skipped ${String(skipped)} (already existed)`
      );
    } catch (error) {
      this.logger.warn(
        'Could not migrate recordings (table may not exist):',
        error
      );
    }
  }
}
