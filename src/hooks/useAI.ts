import { useMemo } from 'react';
import { AIService } from '@/ai/AIService';
import { createProvider } from '@/ai/providers';
import { useAIConfig } from './useAIConfig';

/** Servicio de IA con el proveedor activo en Ajustes (se recrea al cambiar la configuración). */
export function useAI() {
  const info = useAIConfig();
  const ai = useMemo(() => new AIService(createProvider(info.config)), [info.config]);
  return { ai, ...info };
}
