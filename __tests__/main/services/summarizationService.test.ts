import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { SummarizationService } from '../../../src/main/services/summarizationService';
import {
  createMockLemurClient,
  type MockLemurClient,
} from '../../test-helpers/mock-factories';

describe('SummarizationService', () => {
  let summarizationService: SummarizationService;
  let mockLemurClient: MockLemurClient;
  let mockAssemblyAIFactory: { createClient: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks using factories
    mockLemurClient = createMockLemurClient();
    const mockAssemblyAIClient = { lemur: mockLemurClient };
    mockAssemblyAIFactory = {
      createClient: jest.fn().mockResolvedValue(mockAssemblyAIClient),
    };

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
    const mockResponse = 'Mock summary response';

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

      const taskCall = mockLemurClient.task.mock.calls[0][0];
      // Check for key elements that define the system prompt's purpose
      expect(taskCall.prompt).toMatch(/meeting|summariz/i);
      expect(taskCall.prompt).toMatch(/action|task/i);
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
      mockLemurClient.task.mockRejectedValue(apiError);

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
      mockAssemblyAIFactory.createClient.mockRejectedValue(factoryError);

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
      const taskCall = mockLemurClient.task.mock.calls[0][0];
      // Check for key elements that define the system prompt's purpose
      expect(taskCall.prompt).toMatch(/meeting|summariz/i);
      expect(taskCall.prompt).toMatch(/action|task/i);
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
      mockLemurClient.task.mockResolvedValue({});

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

      const taskCall = mockLemurClient.task.mock.calls[0][0];
      expect(taskCall.final_model).toBe('anthropic/claude-sonnet-4-20250514');
    });
  });
});
