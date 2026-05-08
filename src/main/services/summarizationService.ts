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

    let userContent: string;

    if (notes?.trim()) {
      // When notes exist, present them first as the priority content
      userContent = `${summaryPrompt}

## My Notes (what I found important)
${notes}

## Full Transcript (use to fill in details)
${transcript}`;
    } else {
      // No notes - just use transcript
      userContent = `${summaryPrompt}

## Transcript
${transcript}`;
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
