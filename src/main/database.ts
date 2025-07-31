import fs from 'fs';
import path from 'path';

import Database from 'better-sqlite3';
import { app } from 'electron';
import { inject, injectable } from 'tsyringe';

import { DI_TOKENS } from './di-tokens.js';
import { DEFAULT_PROMPTS } from '../constants/defaultPrompts.js';
import {
  PromptTemplate,
  Recording,
  SettingsSchema,
  SlackInstallation,
} from '../types/common.js';
@injectable()
class DatabaseService {
  private db: Database.Database;
  private dbPath: string;

  constructor(
    @inject(DI_TOKENS.Logger)
    private logger: typeof import('./logger.js').default
  ) {
    // Use consistent database name - app.setName() in main.ts handles dev/prod separation
    this.dbPath = path.join(app.getPath('userData'), 'assembly-notes.db');

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
    this.insertDefaultSettings();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        title TEXT,
        transcript TEXT,
        summary TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Create FTS5 virtual table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS recordings_fts USING fts5(
        id UNINDEXED,
        title,
        transcript,
        summary,
        content='recordings',
        content_rowid='rowid'
      )
    `);

    // Create triggers to keep FTS5 table synchronized with recordings table
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS recordings_ai AFTER INSERT ON recordings BEGIN
        INSERT INTO recordings_fts(rowid, id, title, transcript, summary) 
        VALUES (new.rowid, new.id, new.title, new.transcript, new.summary);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS recordings_ad AFTER DELETE ON recordings BEGIN
        INSERT INTO recordings_fts(recordings_fts, rowid, id, title, transcript, summary) 
        VALUES('delete', old.rowid, old.id, old.title, old.transcript, old.summary);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS recordings_au AFTER UPDATE ON recordings BEGIN
        INSERT INTO recordings_fts(recordings_fts, rowid, id, title, transcript, summary) 
        VALUES('delete', old.rowid, old.id, old.title, old.transcript, old.summary);
        INSERT INTO recordings_fts(rowid, id, title, transcript, summary) 
        VALUES (new.rowid, new.id, new.title, new.transcript, new.summary);
      END
    `);

    // Populate FTS5 table with existing data if it's empty
    try {
      const ftsCount = this.db
        .prepare('SELECT COUNT(*) as count FROM recordings_fts')
        .get() as { count: number } | undefined;
      const recordingsCount = this.db
        .prepare('SELECT COUNT(*) as count FROM recordings')
        .get() as { count: number } | undefined;

      if (
        ftsCount?.count === 0 &&
        recordingsCount &&
        recordingsCount.count > 0
      ) {
        this.db.exec(`
          INSERT INTO recordings_fts(rowid, id, title, transcript, summary)
          SELECT rowid, id, title, transcript, summary FROM recordings
        `);
      }
    } catch (error) {
      // FTS5 tables might not be created yet or might not be supported, ignore silently
      this.logger.warn('Could not populate FTS5 table:', error);
    }

    // Remove status column if it exists (migration)
    try {
      this.db.exec('ALTER TABLE recordings DROP COLUMN status');
    } catch {
      // Column may not exist, ignore error
    }

    // Remove duration column if it exists (migration)
    try {
      this.db.exec('ALTER TABLE recordings DROP COLUMN duration');
    } catch {
      // Column may not exist, ignore error
    }
  }

  private insertDefaultSettings(): void {
    const defaults = {
      assemblyaiKey: '',
      customPrompt: '',
      summaryPrompt: '',
      prompts: JSON.stringify(DEFAULT_PROMPTS),
      // Slack OAuth fields
      slackInstallation: JSON.stringify(null),
      autoStart: false,
    };

    const insertStmt = this.db.prepare(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
    );
    const transaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(defaults)) {
        insertStmt.run(
          key,
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      }
    });

    transaction();
  }

  setSetting(key: string, value: unknown): void {
    try {
      const stmt = this.db.prepare(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
      );
      let stringValue: string;
      if (value === undefined) {
        stringValue = 'undefined';
      } else if (typeof value === 'string') {
        stringValue = value;
      } else {
        stringValue = JSON.stringify(value);
      }
      stmt.run(key, stringValue);
    } catch (error) {
      this.logger.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  getSettings(): SettingsSchema {
    try {
      // Fetch all settings in a single query for efficiency
      const stmt = this.db.prepare('SELECT key, value FROM settings');
      const results = stmt.all() as { key: string; value: string }[];

      // Create a map for quick lookup
      const settingsMap = new Map<string, unknown>();
      for (const row of results) {
        try {
          settingsMap.set(row.key, JSON.parse(row.value));
        } catch {
          // For prompts specifically, return empty array on parse error
          if (row.key === 'prompts') {
            settingsMap.set(row.key, []);
          } else {
            settingsMap.set(row.key, row.value);
          }
        }
      }

      return {
        assemblyaiKey: (settingsMap.get('assemblyaiKey') ?? '') as string,
        summaryPrompt: (settingsMap.get('summaryPrompt') ?? '') as string,
        prompts: (settingsMap.get('prompts') ?? []) as PromptTemplate[],
        // Slack OAuth fields
        slackInstallation: (settingsMap.get('slackInstallation') ??
          null) as SlackInstallation | null,
        slackChannels: (settingsMap.get('slackChannels') ?? '') as string,
        autoStart: (settingsMap.get('autoStart') ?? false) as boolean,
      };
    } catch (error) {
      this.logger.error('Error getting all settings:', error);
      // Return default settings if bulk query fails
      return {
        assemblyaiKey: '',
        summaryPrompt: '',
        prompts: [],
        // Slack OAuth fields
        slackInstallation: null,
        slackChannels: '',
        autoStart: false,
      };
    }
  }

  updateSettings(settings: Partial<SettingsSchema>): void {
    try {
      const transaction = this.db.transaction(() => {
        for (const [key, value] of Object.entries(settings)) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (value !== undefined) {
            this.setSetting(key, value);
          }
        }
      });

      transaction();
    } catch (error) {
      this.logger.error('Error updating settings:', error);
      throw error;
    }
  }

  // Recording methods
  saveRecording(
    recording: Omit<Recording, 'created_at' | 'updated_at'> & {
      created_at?: number;
      updated_at?: number;
    }
  ): void {
    try {
      const now = Date.now();
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO recordings 
        (id, title, transcript, summary, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        recording.id,
        recording.title ?? null,
        recording.transcript ?? null,
        recording.summary ?? null,
        recording.created_at ?? now,
        recording.updated_at ?? now
      );
    } catch (error) {
      this.logger.error(`Error saving recording ${recording.id}:`, error);
      throw error;
    }
  }

  getRecording(id: string): Recording | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM recordings WHERE id = ?');
      const result = stmt.get(id) as Recording | undefined;
      return result ?? null;
    } catch (error) {
      this.logger.error(`Error getting recording ${id}:`, error);
      throw error;
    }
  }

  getAllRecordings(): Recording[] {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM recordings ORDER BY created_at DESC'
      );
      return stmt.all() as Recording[];
    } catch (error) {
      this.logger.error('Error getting all recordings:', error);
      throw error;
    }
  }

  updateRecording(
    id: string,
    updates: Partial<Omit<Recording, 'id' | 'created_at'>>
  ): void {
    try {
      // For partial updates, we need to handle the case where only some fields are provided
      // The test expects undefined values to be included when they are explicitly set
      const fields = Object.keys(updates);
      if (fields.length === 0) return;

      const setClause = fields.map((field) => `${field} = ?`).join(', ');
      const values = fields.map(
        (field) => updates[field as keyof typeof updates]
      );

      const stmt = this.db.prepare(`
        UPDATE recordings 
        SET ${setClause}, updated_at = ? 
        WHERE id = ?
      `);

      stmt.run(...values, Date.now(), id);
    } catch (error) {
      this.logger.error(`Error updating recording ${id}:`, error);
      throw error;
    }
  }

  deleteRecording(id: string): void {
    try {
      const stmt = this.db.prepare('DELETE FROM recordings WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      this.logger.error(`Error deleting recording ${id}:`, error);
      throw error;
    }
  }

  searchRecordings(query: string): Recording[] {
    try {
      if (!query.trim()) {
        return this.getAllRecordings();
      }

      // Escape FTS5 special characters and prepare query
      const sanitizedQuery = query
        .trim()
        .replace(/['"]/g, '') // Remove quotes instead of escaping them
        .replace(/[()[\]{}<>]/g, ' ') // Remove special FTS5 characters
        .split(/\s+/)
        .filter((term) => term.length > 0)
        .map((term) => `"${term}"`) // Wrap each term in quotes for exact matching
        .join(' OR '); // Use OR to match any term

      if (!sanitizedQuery) {
        return this.getAllRecordings();
      }

      // Use FTS5 MATCH for full-text search with ranking
      const stmt = this.db.prepare(`
        SELECT r.* FROM recordings r
        JOIN recordings_fts fts ON r.rowid = fts.rowid
        WHERE recordings_fts MATCH ?
        ORDER BY rank, r.created_at DESC
      `);

      return stmt.all(sanitizedQuery) as Recording[];
    } catch (error) {
      this.logger.error(
        `Error searching recordings with query "${query}":`,
        error
      );
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}

export { DatabaseService, type Recording, type SettingsSchema };
