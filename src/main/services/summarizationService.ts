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
    apiKey: string,
    notes?: string
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('AssemblyAI API key not available');
    }

    let userContent = `${summaryPrompt}\n\nTranscript:\n${transcript}`;

    if (notes?.trim()) {
      userContent += `\n\nUser Notes:\n${notes}`;
    }

    return this.llmGateway.chat(
      [
        {
          role: 'system',
          content: SUMMARIZATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      apiKey
    );
  }
}
