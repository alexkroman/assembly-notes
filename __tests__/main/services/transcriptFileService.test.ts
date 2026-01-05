import fs from 'fs/promises';
import path from 'path';

import { app } from 'electron';
import Logger from 'electron-log';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens.js';
import { TranscriptFileService } from '../../../src/main/services/transcriptFileService.js';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('electron-log');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockApp = app as jest.Mocked<typeof app>;

describe('TranscriptFileService', () => {
  let service: TranscriptFileService;
  let mockLogger: jest.Mocked<typeof Logger>;

  const testUserDataPath = '/test/user/data';
  const testTranscriptsDir = path.join(testUserDataPath, 'recordings');

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock app.getPath
    mockApp.getPath.mockReturnValue(testUserDataPath);

    // Mock logger
    mockLogger = Logger as jest.Mocked<typeof Logger>;

    // Register mocks in container
    container.registerInstance(DI_TOKENS.Logger, mockLogger);

    // Create service instance
    service = container.resolve(TranscriptFileService);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('getTranscriptsDir', () => {
    it('should return the correct transcripts directory path', () => {
      expect(service.getTranscriptsDir()).toBe(testTranscriptsDir);
    });
  });

  describe('ensureTranscriptsDirectory', () => {
    it('should create directory if it does not exist', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      await service.ensureTranscriptsDirectory();

      expect(mockFs.mkdir).toHaveBeenCalledWith(testTranscriptsDir, {
        recursive: true,
      });
    });

    it('should throw and log error if directory creation fails', async () => {
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(error);

      await expect(service.ensureTranscriptsDirectory()).rejects.toThrow(
        'Permission denied'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create transcripts directory:',
        error
      );
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with date and slugified title', () => {
      const result = service.generateFilename(
        'Team Meeting Notes',
        new Date('2024-03-15').getTime()
      );
      expect(result).toBe('2024-03-15_team-meeting-notes.md');
    });

    it('should handle empty title', () => {
      const result = service.generateFilename(
        '',
        new Date('2024-03-15').getTime()
      );
      expect(result).toBe('2024-03-15_untitled.md');
    });

    it('should handle title with special characters', () => {
      const result = service.generateFilename(
        'Meeting: Q1 Review! @Company',
        new Date('2024-03-15').getTime()
      );
      expect(result).toBe('2024-03-15_meeting-q1-review-company.md');
    });

    it('should truncate long titles to 50 characters', () => {
      const longTitle =
        'This is a very long meeting title that should be truncated to fifty characters maximum';
      const result = service.generateFilename(
        longTitle,
        new Date('2024-03-15').getTime()
      );
      // The slug part should be max 50 chars
      const slug = result.replace('2024-03-15_', '').replace('.md', '');
      expect(slug.length).toBeLessThanOrEqual(50);
    });
  });

  describe('findUniqueFilename', () => {
    it('should return original filename if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await service.findUniqueFilename('2024-03-15_meeting.md');
      expect(result).toBe('2024-03-15_meeting.md');
    });

    it('should append counter if file exists', async () => {
      mockFs.access
        .mockResolvedValueOnce(undefined) // First call: file exists
        .mockRejectedValueOnce(new Error('ENOENT')); // Second call: _2 doesn't exist

      const result = await service.findUniqueFilename('2024-03-15_meeting.md');
      expect(result).toBe('2024-03-15_meeting_2.md');
    });

    it('should keep incrementing counter until unique name found', async () => {
      mockFs.access
        .mockResolvedValueOnce(undefined) // Original exists
        .mockResolvedValueOnce(undefined) // _2 exists
        .mockResolvedValueOnce(undefined) // _3 exists
        .mockRejectedValueOnce(new Error('ENOENT')); // _4 doesn't exist

      const result = await service.findUniqueFilename('2024-03-15_meeting.md');
      expect(result).toBe('2024-03-15_meeting_4.md');
    });
  });

  describe('saveTranscript', () => {
    const testRecord = {
      id: 'test-id-123',
      title: 'Test Meeting',
      transcript: 'This is the transcript content.',
      summary: 'This is the summary.',
      created_at: new Date('2024-03-15').getTime(),
      updated_at: new Date('2024-03-15').getTime(),
    };

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should save transcript to new file', async () => {
      const filename = await service.saveTranscript(testRecord);

      expect(filename).toBe('2024-03-15_test-meeting.md');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testTranscriptsDir, '2024-03-15_test-meeting.md'),
        expect.stringContaining('id: test-id-123'),
        'utf-8'
      );
    });

    it('should include frontmatter in saved file', async () => {
      await service.saveTranscript(testRecord);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const content = writeCall?.[1] as string;

      expect(content).toContain('---');
      expect(content).toContain('id: test-id-123');
      expect(content).toContain('title: Test Meeting');
      expect(content).toContain('## Transcript');
      expect(content).toContain('This is the transcript content.');
      expect(content).toContain('## Summary');
      expect(content).toContain('This is the summary.');
    });

    it('should update existing file if filename is provided', async () => {
      const recordWithFilename = {
        ...testRecord,
        filename: 'existing-file.md',
      };
      mockFs.access.mockResolvedValueOnce(undefined); // File exists

      const filename = await service.saveTranscript(recordWithFilename);

      expect(filename).toBe('existing-file.md');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testTranscriptsDir, 'existing-file.md'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should include audio_filename in frontmatter when present', async () => {
      const recordWithAudio = {
        ...testRecord,
        audio_filename: 'test-audio.wav',
      };

      await service.saveTranscript(recordWithAudio);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const content = writeCall?.[1] as string;
      expect(content).toContain('audio_filename: test-audio.wav');
    });
  });

  describe('loadTranscript', () => {
    const validMarkdown = `---
id: test-id-123
title: Test Meeting
created_at: 1710460800000
updated_at: 1710460800000
audio_filename: test.wav
---

# Test Meeting

## Transcript

This is the transcript.

## Summary

This is the summary.
`;

    it('should load and parse transcript file', async () => {
      mockFs.readFile.mockResolvedValue(validMarkdown);

      const result = await service.loadTranscript('test-file.md');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id-123');
      expect(result?.title).toBe('Test Meeting');
      expect(result?.transcript).toBe('This is the transcript.');
      expect(result?.summary).toBe('This is the summary.');
      expect(result?.audio_filename).toBe('test.wav');
      expect(result?.filename).toBe('test-file.md');
    });

    it('should return null for file without id', async () => {
      const noIdMarkdown = `---
title: Test
---

Content
`;
      mockFs.readFile.mockResolvedValue(noIdMarkdown);

      const result = await service.loadTranscript('test.md');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No id in frontmatter for test.md'
      );
    });

    it('should return null and log error on file read failure', async () => {
      const error = new Error('File not found');
      mockFs.readFile.mockRejectedValue(error);

      const result = await service.loadTranscript('nonexistent.md');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error loading transcript nonexistent.md:',
        error
      );
    });

    it('should handle markdown without summary section', async () => {
      const noSummaryMarkdown = `---
id: test-123
title: Test
created_at: 1710460800000
updated_at: 1710460800000
---

# Test

## Transcript

Just transcript, no summary.
`;
      mockFs.readFile.mockResolvedValue(noSummaryMarkdown);

      const result = await service.loadTranscript('test.md');

      expect(result?.transcript).toBe('Just transcript, no summary.');
      expect(result?.summary).toBe('');
    });
  });

  describe('getAllTranscripts', () => {
    it('should return all transcripts sorted by date descending', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        'file1.md',
        'file2.md',
        'other.txt',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const markdown1 = `---
id: id-1
title: Older Meeting
created_at: 1710000000000
updated_at: 1710000000000
---

# Older Meeting

## Transcript

Content 1
`;
      const markdown2 = `---
id: id-2
title: Newer Meeting
created_at: 1710500000000
updated_at: 1710500000000
---

# Newer Meeting

## Transcript

Content 2
`;
      mockFs.readFile
        .mockResolvedValueOnce(markdown1)
        .mockResolvedValueOnce(markdown2);

      const results = await service.getAllTranscripts();

      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe('id-2'); // Newer first
      expect(results[1]?.id).toBe('id-1');
    });

    it('should filter out non-markdown files', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        'transcript.md',
        'audio.wav',
        'config.json',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      mockFs.readFile.mockResolvedValue(`---
id: test-id
title: Test
created_at: 1710000000000
updated_at: 1710000000000
---

# Test

## Transcript

Content
`);

      const results = await service.getAllTranscripts();

      expect(results).toHaveLength(1);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on error', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockRejectedValue(new Error('Read error'));

      const results = await service.getAllTranscripts();

      expect(results).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getTranscriptById', () => {
    it('should find transcript by id', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['file.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      mockFs.readFile.mockResolvedValue(`---
id: target-id
title: Found
created_at: 1710000000000
updated_at: 1710000000000
---

# Found

## Transcript

Content
`);

      const result = await service.getTranscriptById('target-id');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('target-id');
    });

    it('should return null if id not found', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['file.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      mockFs.readFile.mockResolvedValue(`---
id: other-id
title: Other
created_at: 1710000000000
updated_at: 1710000000000
---

# Other

## Transcript

Content
`);

      const result = await service.getTranscriptById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateTranscript', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['existing.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      mockFs.readFile.mockResolvedValue(`---
id: update-id
title: Original Title
created_at: 1710000000000
updated_at: 1710000000000
---

# Original Title

## Transcript

Original content
`);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
    });

    it('should update transcript content', async () => {
      const result = await service.updateTranscript('update-id', {
        summary: 'New summary',
      });

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should return false if transcript not found', async () => {
      mockFs.readdir.mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>
      );

      const result = await service.updateTranscript('nonexistent', {
        summary: 'New',
      });

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Transcript not found for update: nonexistent'
      );
    });

    it('should rename file when title changes', async () => {
      mockFs.readFile.mockResolvedValue(`---
id: update-id
title: Original Title
created_at: 1710000000000
updated_at: 1710000000000
---

# Original Title

## Transcript

Content
`);
      // Simulate the file being found with a filename
      mockFs.readdir.mockResolvedValue([
        '2024-03-10_original-title.md',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await service.updateTranscript('update-id', {
        title: 'New Title',
      });

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('deleteTranscript', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
    });

    it('should delete transcript file', async () => {
      mockFs.readdir.mockResolvedValue(['to-delete.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      mockFs.readFile.mockResolvedValue(`---
id: delete-id
title: To Delete
created_at: 1710000000000
updated_at: 1710000000000
---

# To Delete

## Transcript

Content
`);
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await service.deleteTranscript('delete-id');

      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(testTranscriptsDir, 'to-delete.md')
      );
    });

    it('should return false if transcript not found', async () => {
      mockFs.readdir.mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>
      );

      const result = await service.deleteTranscript('nonexistent');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Transcript not found for deletion: nonexistent'
      );
    });

    it('should return false and log error on delete failure', async () => {
      mockFs.readdir.mockResolvedValue(['file.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      mockFs.readFile.mockResolvedValue(`---
id: fail-id
title: Fail
created_at: 1710000000000
updated_at: 1710000000000
---

# Fail

## Transcript

Content
`);
      const error = new Error('Permission denied');
      mockFs.unlink.mockRejectedValue(error);

      const result = await service.deleteTranscript('fail-id');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting transcript fail-id:',
        error
      );
    });
  });

  describe('searchTranscripts', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        'meeting1.md',
        'meeting2.md',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
    });

    it('should return all transcripts for empty query', async () => {
      mockFs.readFile.mockResolvedValueOnce(`---
id: id-1
title: Meeting One
created_at: 1710000000000
updated_at: 1710000000000
---

# Meeting One

## Transcript

Content one
`).mockResolvedValueOnce(`---
id: id-2
title: Meeting Two
created_at: 1710100000000
updated_at: 1710100000000
---

# Meeting Two

## Transcript

Content two
`);

      const results = await service.searchTranscripts('');

      expect(results).toHaveLength(2);
    });

    it('should filter by title', async () => {
      mockFs.readFile.mockResolvedValueOnce(`---
id: id-1
title: Quarterly Review
created_at: 1710000000000
updated_at: 1710000000000
---

# Quarterly Review

## Transcript

Some content
`).mockResolvedValueOnce(`---
id: id-2
title: Team Standup
created_at: 1710100000000
updated_at: 1710100000000
---

# Team Standup

## Transcript

Different content
`);

      const results = await service.searchTranscripts('quarterly');

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Quarterly Review');
    });

    it('should filter by transcript content', async () => {
      mockFs.readFile.mockResolvedValueOnce(`---
id: id-1
title: Meeting A
created_at: 1710000000000
updated_at: 1710000000000
---

# Meeting A

## Transcript

Discussion about budget
`).mockResolvedValueOnce(`---
id: id-2
title: Meeting B
created_at: 1710100000000
updated_at: 1710100000000
---

# Meeting B

## Transcript

Discussion about timeline
`);

      const results = await service.searchTranscripts('budget');

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('id-1');
    });

    it('should be case insensitive', async () => {
      mockFs.readFile.mockResolvedValue(`---
id: id-1
title: IMPORTANT Meeting
created_at: 1710000000000
updated_at: 1710000000000
---

# IMPORTANT Meeting

## Transcript

Content
`);
      mockFs.readdir.mockResolvedValue(['file.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);

      const results = await service.searchTranscripts('important');

      expect(results).toHaveLength(1);
    });
  });

  describe('transcriptExists', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
    });

    it('should return true if transcript exists', async () => {
      mockFs.readdir.mockResolvedValue(['file.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      mockFs.readFile.mockResolvedValue(`---
id: exists-id
title: Exists
created_at: 1710000000000
updated_at: 1710000000000
---

# Exists

## Transcript

Content
`);

      const result = await service.transcriptExists('exists-id');

      expect(result).toBe(true);
    });

    it('should return false if transcript does not exist', async () => {
      mockFs.readdir.mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.readdir>>
      );

      const result = await service.transcriptExists('nonexistent');

      expect(result).toBe(false);
    });
  });
});
