/**
 * Ajustes del usuario (persistidos en localStorage con la clave "omnilearn-settings").
 * index.html lee `state.theme` de esta misma clave para aplicar el tema antes de pintar.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultProviderConfig, PROVIDER_ORDER } from '@/ai/providers/meta';
import type { ProviderConfig, ProviderId } from '@/ai/types';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ReadingFont = 'sans' | 'serif';
export type TextSize = 'sm' | 'md' | 'lg';

export interface SettingsState {
  theme: ThemePreference;
  readingFont: ReadingFont;
  textSize: TextSize;
  sidebarCollapsed: boolean;

  activeProvider: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;

  /** Idioma en que se genera el contenido. */
  contentLanguage: string;
  /** Nota mínima del quiz para completar una lección (aprendizaje por dominio). */
  quizPassThreshold: number;
  /** Pedir nivel de confianza en cada respuesta (entrena la calibración). */
  askConfidence: boolean;
  /** Convertir los fallos del quiz en tarjetas de repaso. */
  errorsToCards: boolean;
  /** Desbloqueo secuencial por defecto en las rutas nuevas. */
  sequentialByDefault: boolean;
  /** Retención deseada para FSRS (0,80-0,97). */
  desiredRetention: number;
  /** Tarjetas nuevas como máximo por sesión de repaso. */
  newCardsPerSession: number;

  setTheme: (theme: ThemePreference) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  setActiveProvider: (id: ProviderId) => void;
  updateProvider: (id: ProviderId, patch: Partial<ProviderConfig>) => void;
  resetProvider: (id: ProviderId) => void;
}

type Preferences = Pick<
  SettingsState,
  | 'readingFont'
  | 'textSize'
  | 'sidebarCollapsed'
  | 'contentLanguage'
  | 'quizPassThreshold'
  | 'askConfidence'
  | 'errorsToCards'
  | 'sequentialByDefault'
  | 'desiredRetention'
  | 'newCardsPerSession'
>;

function defaultProviders(): Record<ProviderId, ProviderConfig> {
  return Object.fromEntries(PROVIDER_ORDER.map((id) => [id, defaultProviderConfig(id)])) as Record<
    ProviderId,
    ProviderConfig
  >;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      readingFont: 'sans',
      textSize: 'md',
      sidebarCollapsed: false,
      activeProvider: 'demo',
      providers: defaultProviders(),
      contentLanguage: 'es',
      quizPassThreshold: 0.7,
      askConfidence: true,
      errorsToCards: true,
      sequentialByDefault: true,
      desiredRetention: 0.9,
      newCardsPerSession: 20,

      setTheme: (theme) => set({ theme }),
      setPreference: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      setActiveProvider: (id) => set({ activeProvider: id }),
      updateProvider: (id, patch) =>
        set((state) => ({
          providers: { ...state.providers, [id]: { ...state.providers[id], ...patch, id } },
        })),
      resetProvider: (id) =>
        set((state) => ({ providers: { ...state.providers, [id]: defaultProviderConfig(id) } })),
    }),
    {
      name: 'omnilearn-settings',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Si añadimos proveedores en el futuro, completamos los que falten.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...p,
          providers: { ...defaultProviders(), ...(p.providers ?? {}) },
        };
      },
    },
  ),
);

export function resolveTheme(pref: ThemePreference): 'dark' | 'light' {
  if (pref === 'system') {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return pref;
}
