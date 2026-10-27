import { isProviderReady, PROVIDERS } from '@/ai/providers/meta';
import { useSettings } from '@/stores/settings';

/** Proveedor activo y su configuración, sin cargar los adaptadores de IA (para la barra lateral, etc.). */
export function useAIConfig() {
  const activeId = useSettings((s) => s.activeProvider);
  const config = useSettings((s) => s.providers[s.activeProvider]);
  return {
    config,
    meta: PROVIDERS[activeId],
    ready: isProviderReady(config),
    isDemo: activeId === 'demo',
  };
}
