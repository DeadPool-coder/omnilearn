import type { LLMProvider, ProviderConfig } from '../types';
import { AnthropicProvider } from './anthropic';
import { DemoProvider } from './demo';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';
import { OpenAICompatibleProvider } from './openai';

export * from './meta';

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.id) {
    case 'demo':
      return new DemoProvider(config);
    case 'openai':
      return new OpenAICompatibleProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
  }
}
