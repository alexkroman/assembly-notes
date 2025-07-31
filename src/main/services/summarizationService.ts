import { inject, injectable } from 'tsyringe';

import { SUMMARIZATION_SYSTEM_PROMPT } from '../../constants/prompts.js';
import { DI_TOKENS } from '../di-tokens.js';

// Abstract interface for AssemblyAI Lemur client
export interface IAssemblyAILemurClient {
  task(params: {
    prompt: string;
    input_text: string;
    final_model: string;
  }): Promise<{ response: string }>;
}

// Abstract interface for AssemblyAI client with Lemur
export interface IAssemblyAIClientWithLemur {
  lemur: IAssemblyAILemurClient;
}

// Abstract interface for AssemblyAI factory that creates clients with Lemur
export interface IAssemblyAIFactoryWithLemur {
  createClient(apiKey: string): Promise<IAssemblyAIClientWithLemur>;
}

// Concrete implementation
export class AssemblyAIFactoryWithLemur implements IAssemblyAIFactoryWithLemur {
  async createClient(apiKey: string): Promise<IAssemblyAIClientWithLemur> {
    // This will be mocked in tests
    const { AssemblyAI } = await import('assemblyai');
    return new AssemblyAI({ apiKey });
  }
}

@injectable()
export class SummarizationService {
  constructor(
    @inject(DI_TOKENS.AssemblyAIFactoryWithLemur)
    private assemblyAIFactory: IAssemblyAIFactoryWithLemur
  ) {}

  async summarizeTranscript(
    transcript: string,
    summaryPrompt: string,
    apiKey: string
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('AssemblyAI API key not available');
    }

    const aai = await this.assemblyAIFactory.createClient(apiKey);
    const lemur = aai.lemur;
    const combinedPrompt = `${SUMMARIZATION_SYSTEM_PROMPT}\n\n${summaryPrompt}`;

    const response = await lemur.task({
      prompt: combinedPrompt,
      input_text: transcript,
      final_model: 'anthropic/claude-sonnet-4-20250514',
    });

    return response.response;
  }
}
