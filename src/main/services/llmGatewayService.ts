import { injectable } from 'tsyringe';

const LLM_GATEWAY_URL =
  'https://llm-gateway.assemblyai.com/v1/chat/completions';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

export interface LLMGatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGatewayResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

@injectable()
export class LLMGatewayService {
  async chat(
    messages: LLMGatewayMessage[],
    apiKey: string,
    options?: {
      model?: string;
      maxTokens?: number;
      signal?: AbortSignal;
    }
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('AssemblyAI API key not available');
    }

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model ?? DEFAULT_MODEL,
        messages,
        max_tokens: options?.maxTokens ?? 4000,
      }),
    };

    if (options?.signal) {
      fetchOptions.signal = options.signal;
    }

    const response = await fetch(LLM_GATEWAY_URL, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LLM Gateway error: ${String(response.status)} - ${errorText}`
      );
    }

    const result = (await response.json()) as LLMGatewayResponse;
    const firstChoice = result.choices[0];

    if (!firstChoice) {
      throw new Error('No response content from LLM Gateway');
    }

    return firstChoice.message.content;
  }
}
