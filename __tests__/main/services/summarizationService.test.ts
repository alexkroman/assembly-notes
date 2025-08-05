import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import {
  IAssemblyAIFactoryWithLemur,
  IAssemblyAIClientWithLemur,
  IAssemblyAILemurClient,
  SummarizationService,
} from '../../../src/main/services/summarizationService';

// Mock Lemur client
const mockLemurClient: IAssemblyAILemurClient = {
  task: jest.fn(),
};

// Mock AssemblyAI client
const mockAssemblyAIClient: IAssemblyAIClientWithLemur = {
  lemur: mockLemurClient,
};

// Mock AssemblyAI factory
const mockAssemblyAIFactory: IAssemblyAIFactoryWithLemur = {
  createClient: jest.fn(() => Promise.resolve(mockAssemblyAIClient)),
};

describe('SummarizationService', () => {
  let summarizationService: SummarizationService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock to its default behavior
    (mockAssemblyAIFactory.createClient as jest.Mock).mockResolvedValue(
      mockAssemblyAIClient
    );
    (mockLemurClient.task as jest.Mock).mockResolvedValue({
      response: 'This is a summary of the meeting.',
    });

    // Register mocks in container
    container.register(DI_TOKENS.AssemblyAIFactoryWithLemur, {
      useValue: mockAssemblyAIFactory,
    });

    summarizationService = container.resolve(SummarizationService);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('summarizeTranscript', () => {
    const mockTranscript = 'This is a test transcript about a meeting.';
    const mockSummaryPrompt = 'Please summarize this meeting.';
    const mockApiKey = 'test-api-key';
    const mockResponse = 'This is a summary of the meeting.';

    beforeEach(() => {
      (mockLemurClient.task as jest.Mock).mockResolvedValue({
        response: mockResponse,
      });
    });

    it('should successfully summarize transcript', async () => {
      const result = await summarizationService.summarizeTranscript(
        mockTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      expect(mockAssemblyAIFactory.createClient).toHaveBeenCalledWith(
        mockApiKey
      );
      expect(mockLemurClient.task).toHaveBeenCalledWith({
        prompt: expect.stringContaining(mockSummaryPrompt),
        input_text: mockTranscript,
        final_model: 'anthropic/claude-sonnet-4-20250514',
      });
    });

    it('should include system prompt in combined prompt', async () => {
      await summarizationService.summarizeTranscript(
        mockTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      const taskCall = (mockLemurClient.task as jest.Mock).mock.calls[0][0];
      expect(taskCall.prompt).toContain(
        'You are a sophisticated AI assistant specializing in meeting summarization'
      );
      expect(taskCall.prompt).toContain(mockSummaryPrompt);
    });

    it('should throw error when API key is missing', async () => {
      await expect(
        summarizationService.summarizeTranscript(
          mockTranscript,
          mockSummaryPrompt,
          ''
        )
      ).rejects.toThrow('AssemblyAI API key not available');

      expect(mockAssemblyAIFactory.createClient).not.toHaveBeenCalled();
    });

    it('should throw error when API key is null', async () => {
      await expect(
        summarizationService.summarizeTranscript(
          mockTranscript,
          mockSummaryPrompt,
          null as any
        )
      ).rejects.toThrow('AssemblyAI API key not available');
    });

    it('should handle Lemur API errors', async () => {
      const apiError = new Error('Lemur API error');
      (mockLemurClient.task as jest.Mock).mockRejectedValue(apiError);

      await expect(
        summarizationService.summarizeTranscript(
          mockTranscript,
          mockSummaryPrompt,
          mockApiKey
        )
      ).rejects.toThrow('Lemur API error');
    });

    it('should handle factory creation errors', async () => {
      const factoryError = new Error('Failed to create client');
      (mockAssemblyAIFactory.createClient as jest.Mock).mockRejectedValue(
        factoryError
      );

      await expect(
        summarizationService.summarizeTranscript(
          mockTranscript,
          mockSummaryPrompt,
          mockApiKey
        )
      ).rejects.toThrow('Failed to create client');
    });

    it('should handle empty transcript', async () => {
      const result = await summarizationService.summarizeTranscript(
        '',
        mockSummaryPrompt,
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      expect(mockLemurClient.task).toHaveBeenCalledWith({
        prompt: expect.any(String),
        input_text: '',
        final_model: 'anthropic/claude-sonnet-4-20250514',
      });
    });

    it('should handle empty summary prompt', async () => {
      const result = await summarizationService.summarizeTranscript(
        mockTranscript,
        '',
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      const taskCall = (mockLemurClient.task as jest.Mock).mock.calls[0][0];
      expect(taskCall.prompt).toContain(
        'You are a sophisticated AI assistant specializing in meeting summarization'
      );
    });

    it('should handle very long transcripts', async () => {
      const longTranscript = 'Test content. '.repeat(1000);

      const result = await summarizationService.summarizeTranscript(
        longTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      expect(mockLemurClient.task).toHaveBeenCalledWith({
        prompt: expect.any(String),
        input_text: longTranscript,
        final_model: 'anthropic/claude-sonnet-4-20250514',
      });
    });

    it('should handle special characters in transcript', async () => {
      const specialTranscript =
        'Test with "quotes" & special <characters> \n\n';

      const result = await summarizationService.summarizeTranscript(
        specialTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      expect(mockLemurClient.task).toHaveBeenCalledWith({
        prompt: expect.any(String),
        input_text: specialTranscript,
        final_model: 'anthropic/claude-sonnet-4-20250514',
      });
    });

    it('should handle undefined response from Lemur', async () => {
      (mockLemurClient.task as jest.Mock).mockResolvedValue({});

      const result = await summarizationService.summarizeTranscript(
        mockTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      expect(result).toBeUndefined();
    });

    it('should use correct Claude model', async () => {
      await summarizationService.summarizeTranscript(
        mockTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      const taskCall = (mockLemurClient.task as jest.Mock).mock.calls[0][0];
      expect(taskCall.final_model).toBe('anthropic/claude-sonnet-4-20250514');
    });
  });
});
