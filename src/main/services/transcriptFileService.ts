import fs from 'fs/promises';
import path from 'path';

import { app } from 'electron';
import { inject, injectable } from 'tsyringe';

import type { Recording } from '../../types/common.js';
import { DI_TOKENS } from '../di-tokens.js';
import type Logger from '../logger.js';

// Interface for transcript record with optional filename
export interface TranscriptRecord extends Recording {
  filename?: string;
}

@injectable()
export class TranscriptFileService {
  private transcriptsDir: string;

  constructor(@inject(DI_TOKENS.Logger) private logger: typeof Logger) {
    const userData = app.getPath('userData');
    // Store transcripts in same directory as audio recordings
    this.transcriptsDir = path.join(userData, 'recordings');
  }

  /**
   * Ensure the transcripts directory exists
   */
  async ensureTranscriptsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.transcriptsDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create transcripts directory:', error);
      throw error;
    }
  }

  /**
   * Get the transcripts directory path
   */
  getTranscriptsDir(): string {
    return this.transcriptsDir;
  }

  /**
   * Convert a title to a URL-safe slug
   */
  private slugify(title: string): string {
    if (!title || title.trim() === '') {
      return 'untitled';
    }

    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Spaces to hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  /**
   * Generate a filename from title and creation date
   */
  generateFilename(title: string, createdAt: number): string {
    const date = new Date(createdAt);
    const dateStr = date.toISOString().split('T')[0] ?? 'unknown-date'; // YYYY-MM-DD
    const slug = this.slugify(title) || 'untitled';
    return `${dateStr}_${slug}.md`;
  }

  /**
   * Find a unique filename by appending a counter if needed
   */
  async findUniqueFilename(baseFilename: string): Promise<string> {
    const basePath = path.join(this.transcriptsDir, baseFilename);

    try {
      await fs.access(basePath);
    } catch {
      // File doesn't exist, we can use this name
      return baseFilename;
    }

    // File exists, find a unique name
    const ext = path.extname(baseFilename);
    const nameWithoutExt = baseFilename.slice(0, -ext.length);

    let counter = 2;
    while (counter < 1000) {
      // Safety limit
      const newFilename = `${nameWithoutExt}_${String(counter)}${ext}`;
      const newPath = path.join(this.transcriptsDir, newFilename);
      try {
        await fs.access(newPath);
        counter++;
      } catch {
        return newFilename;
      }
    }

    throw new Error(`Could not find unique filename for ${baseFilename}`);
  }

  /**
   * Parse YAML frontmatter from markdown content
   */
  private parseFrontmatter(content: string): {
    frontmatter: Record<string, string | number | boolean>;
    body: string;
  } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = frontmatterRegex.exec(content);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterStr = match[1] ?? '';
    const body = match[2] ?? '';
    const frontmatter: Record<string, string | number | boolean> = {};

    // Simple YAML parsing for our known keys
    for (const line of frontmatterStr.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        // Parse numeric values
        if (/^\d+$/.test(value)) {
          frontmatter[key] = parseInt(value, 10);
        } else if (value === 'true' || value === 'false') {
          frontmatter[key] = value === 'true';
        } else {
          frontmatter[key] = value;
        }
      }
    }

    return { frontmatter, body };
  }

  /**
   * Generate YAML frontmatter string
   */
  private generateFrontmatter(record: TranscriptRecord): string {
    const lines = [
      '---',
      `id: ${record.id}`,
      `title: ${record.title ?? 'Untitled'}`,
      `created_at: ${String(record.created_at)}`,
      `updated_at: ${String(record.updated_at)}`,
    ];

    if (record.audio_filename) {
      lines.push(`audio_filename: ${record.audio_filename}`);
    }

    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Generate full markdown content for a transcript
   */
  private generateMarkdownContent(record: TranscriptRecord): string {
    const frontmatter = this.generateFrontmatter(record);
    const title = record.title ?? 'Untitled';
    const transcript = record.transcript ?? '';
    const summary = record.summary ?? '';

    const sections = [
      frontmatter,
      '',
      `# ${title}`,
      '',
      '## Transcript',
      '',
      transcript,
    ];

    if (summary) {
      sections.push('', '## Summary', '', summary);
    }

    return sections.join('\n') + '\n';
  }

  /**
   * Parse markdown content back to a TranscriptRecord
   */
  private parseMarkdownContent(
    content: string,
    filename: string
  ): TranscriptRecord | null {
    try {
      const { frontmatter, body } = this.parseFrontmatter(content);

      const id = frontmatter['id'];
      if (!id || typeof id !== 'string') {
        this.logger.warn(`No id in frontmatter for ${filename}`);
        return null;
      }

      // Extract transcript and summary from body
      let transcript = '';
      let summary = '';

      // Look for ## Transcript and ## Summary sections
      const transcriptMatch = /## Transcript\n\n([\s\S]*?)(?=\n## |$)/.exec(
        body
      );
      const summaryMatch = /## Summary\n\n([\s\S]*?)$/.exec(body);

      if (transcriptMatch?.[1]) {
        transcript = transcriptMatch[1].trim();
      }
      if (summaryMatch?.[1]) {
        summary = summaryMatch[1].trim();
      }

      const title = frontmatter['title'];
      const audioFilename = frontmatter['audio_filename'];
      const createdAt = frontmatter['created_at'];
      const updatedAt = frontmatter['updated_at'];

      const result: TranscriptRecord = {
        id,
        title: typeof title === 'string' ? title : 'Untitled',
        transcript,
        summary,
        created_at: typeof createdAt === 'number' ? createdAt : Date.now(),
        updated_at: typeof updatedAt === 'number' ? updatedAt : Date.now(),
        filename,
      };

      if (typeof audioFilename === 'string') {
        result.audio_filename = audioFilename;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error parsing markdown content for ${filename}:`,
        error
      );
      return null;
    }
  }

  /**
   * Save a transcript to a markdown file
   * Returns the filename used
   */
  async saveTranscript(record: TranscriptRecord): Promise<string> {
    await this.ensureTranscriptsDirectory();

    const baseFilename = this.generateFilename(
      record.title ?? 'Untitled',
      record.created_at
    );

    // Check if this record already has a file (update case)
    if (record.filename) {
      const existingPath = path.join(this.transcriptsDir, record.filename);
      try {
        await fs.access(existingPath);
        // File exists, update it
        const content = this.generateMarkdownContent(record);
        await fs.writeFile(existingPath, content, 'utf-8');
        this.logger.debug(`Updated transcript file: ${record.filename}`);
        return record.filename;
      } catch {
        // File doesn't exist, continue to create new one
      }
    }

    // Find unique filename and save
    const filename = await this.findUniqueFilename(baseFilename);
    const filePath = path.join(this.transcriptsDir, filename);
    const content = this.generateMarkdownContent(record);

    await fs.writeFile(filePath, content, 'utf-8');
    this.logger.debug(`Saved transcript file: ${filename}`);

    return filename;
  }

  /**
   * Load a transcript from a markdown file
   */
  async loadTranscript(filename: string): Promise<TranscriptRecord | null> {
    const filePath = path.join(this.transcriptsDir, filename);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseMarkdownContent(content, filename);
    } catch (error) {
      this.logger.error(`Error loading transcript ${filename}:`, error);
      return null;
    }
  }

  /**
   * Get all transcripts sorted by date (newest first)
   */
  async getAllTranscripts(): Promise<TranscriptRecord[]> {
    await this.ensureTranscriptsDirectory();

    try {
      const files = await fs.readdir(this.transcriptsDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      const transcripts: TranscriptRecord[] = [];

      for (const filename of mdFiles) {
        const record = await this.loadTranscript(filename);
        if (record) {
          transcripts.push(record);
        }
      }

      // Sort by created_at descending (newest first)
      transcripts.sort((a, b) => b.created_at - a.created_at);

      return transcripts;
    } catch (error) {
      this.logger.error('Error getting all transcripts:', error);
      return [];
    }
  }

  /**
   * Find a transcript by its ID
   */
  async getTranscriptById(id: string): Promise<TranscriptRecord | null> {
    const transcripts = await this.getAllTranscripts();
    return transcripts.find((t) => t.id === id) ?? null;
  }

  /**
   * Update a transcript file
   */
  async updateTranscript(
    id: string,
    updates: Partial<Omit<Recording, 'id' | 'created_at'>>
  ): Promise<boolean> {
    const existing = await this.getTranscriptById(id);
    if (!existing) {
      this.logger.warn(`Transcript not found for update: ${id}`);
      return false;
    }

    const updated: TranscriptRecord = {
      ...existing,
      ...updates,
      updated_at: Date.now(),
    };

    // If title changed, we may need to rename the file
    if (
      updates.title &&
      updates.title !== existing.title &&
      existing.filename
    ) {
      const newBaseFilename = this.generateFilename(
        updates.title,
        existing.created_at
      );

      // Check if new filename is different from current
      if (newBaseFilename !== existing.filename) {
        const newFilename = await this.findUniqueFilename(newBaseFilename);
        const oldPath = path.join(this.transcriptsDir, existing.filename);
        const newPath = path.join(this.transcriptsDir, newFilename);

        // Write to new file, then delete old
        updated.filename = newFilename;
        const content = this.generateMarkdownContent(updated);
        await fs.writeFile(newPath, content, 'utf-8');

        try {
          await fs.unlink(oldPath);
        } catch {
          // Old file might not exist, that's ok
        }

        this.logger.debug(
          `Renamed transcript: ${existing.filename} -> ${newFilename}`
        );
        return true;
      }
    }

    // Just update the existing file
    await this.saveTranscript(updated);
    return true;
  }

  /**
   * Delete a transcript file
   */
  async deleteTranscript(id: string): Promise<boolean> {
    const transcript = await this.getTranscriptById(id);
    if (!transcript?.filename) {
      this.logger.warn(`Transcript not found for deletion: ${id}`);
      return false;
    }

    const filePath = path.join(this.transcriptsDir, transcript.filename);

    try {
      await fs.unlink(filePath);
      this.logger.debug(`Deleted transcript file: ${transcript.filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting transcript ${id}:`, error);
      return false;
    }
  }

  /**
   * Search transcripts by query (basic text matching)
   */
  async searchTranscripts(query: string): Promise<TranscriptRecord[]> {
    if (!query.trim()) {
      return this.getAllTranscripts();
    }

    const allTranscripts = await this.getAllTranscripts();
    const lowerQuery = query.toLowerCase();

    return allTranscripts.filter((t) => {
      const title = (t.title ?? '').toLowerCase();
      const transcript = (t.transcript ?? '').toLowerCase();
      const summary = (t.summary ?? '').toLowerCase();

      return (
        title.includes(lowerQuery) ||
        transcript.includes(lowerQuery) ||
        summary.includes(lowerQuery)
      );
    });
  }

  /**
   * Check if a transcript file exists for a given ID
   */
  async transcriptExists(id: string): Promise<boolean> {
    const transcript = await this.getTranscriptById(id);
    return transcript !== null;
  }
}
