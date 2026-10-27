import { useEffect, useSyncExternalStore } from 'react';
import { resolveTheme, useSettings } from '@/stores/settings';

function subscribeSystemTheme(callback: () => void) {
  const mq = window.matchMedia?.('(prefers-color-scheme: light)');
  mq?.addEventListener('change', callback);
  return () => mq?.removeEventListener('change', callback);
}

function systemPrefersLight() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
}

/** Tema efectivo ('dark' | 'light'), reaccionando a cambios del sistema si el usuario eligió "Sistema". */
export function useResolvedTheme(): 'dark' | 'light' {
  const pref = useSettings((s) => s.theme);
  const prefersLight = useSyncExternalStore(subscribeSystemTheme, systemPrefersLight, () => false);
  if (pref === 'system') return prefersLight ? 'light' : 'dark';
  return resolveTheme(pref);
}

/** Aplica el tema al <html> (se monta una vez en App). */
export function useApplyTheme() {
  const theme = useResolvedTheme();
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0c0d10' : '#ffffff');
  }, [theme]);
}
