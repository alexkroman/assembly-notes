import { container } from 'tsyringe';

import { DI_TOKENS } from '../../../src/main/di-tokens';
import { SummarizationService } from '../../../src/main/services/summarizationService';

describe('SummarizationService', () => {
  let summarizationService: SummarizationService;
  let mockLLMGatewayService: { chat: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock LLM Gateway service
    mockLLMGatewayService = {
      chat: jest.fn().mockResolvedValue('Mock summary response'),
    };

    // Register mocks in container
    container.register(DI_TOKENS.LLMGatewayService, {
      useValue: mockLLMGatewayService,
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
      expect(mockLLMGatewayService.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(mockSummaryPrompt),
          }),
        ]),
        mockApiKey
      );
    });

    it('should include system prompt in messages', async () => {
      await summarizationService.summarizeTranscript(
        mockTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      const chatCall = mockLLMGatewayService.chat.mock.calls[0];
      const messages = chatCall[0];
      const systemMessage = messages.find(
        (m: { role: string }) => m.role === 'system'
      );
      const userMessage = messages.find(
        (m: { role: string }) => m.role === 'user'
      );

      expect(systemMessage).toBeDefined();
      expect(userMessage.content).toContain(mockSummaryPrompt);
      expect(userMessage.content).toContain(mockTranscript);
    });

    it('should throw error when API key is missing', async () => {
      await expect(
        summarizationService.summarizeTranscript(
          mockTranscript,
          mockSummaryPrompt,
          ''
        )
      ).rejects.toThrow('AssemblyAI API key not available');

      expect(mockLLMGatewayService.chat).not.toHaveBeenCalled();
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

    it('should handle LLM Gateway errors', async () => {
      const apiError = new Error('LLM Gateway error');
      mockLLMGatewayService.chat.mockRejectedValue(apiError);

      await expect(
        summarizationService.summarizeTranscript(
          mockTranscript,
          mockSummaryPrompt,
          mockApiKey
        )
      ).rejects.toThrow('LLM Gateway error');
    });

    it('should handle empty transcript', async () => {
      const result = await summarizationService.summarizeTranscript(
        '',
        mockSummaryPrompt,
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      const userMessage = mockLLMGatewayService.chat.mock.calls[0][0].find(
        (m: { role: string }) => m.role === 'user'
      );
      expect(userMessage.content).toContain('Transcript:\n');
    });

    it('should handle empty summary prompt', async () => {
      const result = await summarizationService.summarizeTranscript(
        mockTranscript,
        '',
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      const systemMessage = mockLLMGatewayService.chat.mock.calls[0][0].find(
        (m: { role: string }) => m.role === 'system'
      );
      expect(systemMessage).toBeDefined();
    });

    it('should handle very long transcripts', async () => {
      const longTranscript = 'Test content. '.repeat(1000);

      const result = await summarizationService.summarizeTranscript(
        longTranscript,
        mockSummaryPrompt,
        mockApiKey
      );

      expect(result).toBe(mockResponse);
      const userMessage = mockLLMGatewayService.chat.mock.calls[0][0].find(
        (m: { role: string }) => m.role === 'user'
      );
      expect(userMessage.content).toContain(longTranscript);
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
      const userMessage = mockLLMGatewayService.chat.mock.calls[0][0].find(
        (m: { role: string }) => m.role === 'user'
      );
      expect(userMessage.content).toContain(specialTranscript);
    });
  });
});
