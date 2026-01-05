import { inject, injectable } from 'tsyringe';

import { SUMMARIZATION_SYSTEM_PROMPT } from '../../constants/prompts.js';
import { DI_TOKENS } from '../di-tokens.js';
import { LLMGatewayService } from './llmGatewayService.js';

@injectable()
export class SummarizationService {
  constructor(
    @inject(DI_TOKENS.LLMGatewayService)
    private llmGateway: LLMGatewayService
  ) {}

  async summarizeTranscript(
    transcript: string,
    summaryPrompt: string,
    apiKey: string
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('AssemblyAI API key not available');
    }

    return this.llmGateway.chat(
      [
        {
          role: 'system',
          content: SUMMARIZATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `${summaryPrompt}\n\nTranscript:\n${transcript}`,
        },
      ],
      apiKey
    );
  }
}
