/**
 * Metadatos de los proveedores de IA (sin sus implementaciones).
 * Separado de providers/index.ts para que la interfaz pueda mostrarlos sin cargar los adaptadores.
 */
import type { ProviderConfig, ProviderId } from '../types';

export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export const CLAUDE_DEFAULT_MODEL = 'claude-opus-5-5';
export const CLAUDE_MODEL_SUGGESTIONS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_DEFAULT_MODEL = 'gemini-3.6-flash';
export const GEMINI_MODEL_SUGGESTIONS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
];

export const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434';
export const OLLAMA_DEFAULT_MODEL = 'qwen3:8b';
export const OLLAMA_MODEL_SUGGESTIONS = [
  'qwen3:8b',
  'gemma3:12b',
  'llama3.1:8b',
  'gpt-oss:20b',
  'mistral-small',
];

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  tagline: string;
  needsKey: boolean;
  defaultModel: string;
  modelSuggestions: string[];
  defaultBaseUrl: string;
  keyUrl?: string;
  keyPlaceholder?: string;
  notes: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  demo: {
    id: 'demo',
    label: 'Demo (sin IA)',
    tagline: 'Funciona sin clave ni conexión, con plantillas.',
    needsKey: false,
    defaultModel: 'plantillas',
    modelSuggestions: ['plantillas'],
    defaultBaseUrl: '',
    notes:
      'Ideal para probar la app. Genera guías de estudio genéricas para cualquier tema; para contenido real del tema, conecta un proveedor.',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI / compatible',
    tagline: 'OpenAI, OpenRouter, Groq, DeepSeek, Mistral, LM Studio…',
    needsKey: true,
    defaultModel: 'gpt-5-mini',
    modelSuggestions: ['gpt-5-mini', 'gpt-5.5', 'gpt-5'],
    defaultBaseUrl: OPENAI_DEFAULT_BASE_URL,
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…',
    notes:
      'Cualquier servidor con la API Chat Completions. Cambia la URL base para OpenRouter (https://openrouter.ai/api/v1), Groq, LM Studio (http://localhost:1234/v1), etc.',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    tagline: 'Claude Opus, Sonnet y Haiku con salida estructurada.',
    needsKey: true,
    defaultModel: CLAUDE_DEFAULT_MODEL,
    modelSuggestions: CLAUDE_MODEL_SUGGESTIONS,
    defaultBaseUrl: '',
    keyUrl: 'https://platform.claude.com/settings/keys',
    keyPlaceholder: 'sk-ant-…',
    notes:
      'Usa el SDK oficial con salida estructurada (JSON Schema). Opus da la máxima calidad; Sonnet y Haiku son más rápidos y económicos.',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    tagline: 'Modelos Gemini vía Google AI Studio.',
    needsKey: true,
    defaultModel: GEMINI_DEFAULT_MODEL,
    modelSuggestions: GEMINI_MODEL_SUGGESTIONS,
    defaultBaseUrl: GEMINI_DEFAULT_BASE_URL,
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza…',
    notes:
      'Usa responseJsonSchema para forzar el formato. Pulsa «Cargar modelos» para ver los disponibles con tu clave.',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    tagline: 'Modelos en tu propio equipo: gratis y privado.',
    needsKey: false,
    defaultModel: OLLAMA_DEFAULT_MODEL,
    modelSuggestions: OLLAMA_MODEL_SUGGESTIONS,
    defaultBaseUrl: OLLAMA_DEFAULT_BASE_URL,
    notes:
      'Instala Ollama, descarga un modelo (ollama pull qwen3:8b) y ábrelo. Si sirves Omnilearn desde un dominio que no sea localhost, arranca Ollama con OLLAMA_ORIGINS.',
  },
};

export const PROVIDER_ORDER: ProviderId[] = ['demo', 'anthropic', 'openai', 'gemini', 'ollama'];

/** ¿Tiene la configuración lo mínimo para intentar una llamada? */
export function isProviderReady(config: ProviderConfig): boolean {
  const meta = PROVIDERS[config.id];
  if (!meta.needsKey) return true;
  // Con una URL base propia (proxy) la clave puede ir vacía.
  const customBase = config.baseUrl.trim() && config.baseUrl.trim() !== meta.defaultBaseUrl;
  return Boolean(config.apiKey.trim() || customBase);
}

export function defaultProviderConfig(id: ProviderId): ProviderConfig {
  const meta = PROVIDERS[id];
  return {
    id,
    apiKey: '',
    model: meta.defaultModel,
    baseUrl: '',
    structuredMode: id === 'openai' ? 'json_schema' : undefined,
    effort: id === 'anthropic' ? 'medium' : undefined,
  };
}
