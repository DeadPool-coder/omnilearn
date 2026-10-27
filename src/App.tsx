import { useEffect } from 'react';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from 'sonner';
import { ensureSeeded } from './db/seed';
import { useApplyTheme, useResolvedTheme } from './hooks/useTheme';
import { router } from './router';

export default function App() {
  useApplyTheme();
  const theme = useResolvedTheme();

  useEffect(() => {
    // Primera vez: instala el curso de ejemplo para que la app no empiece vacía.
    ensureSeeded().catch((error) => console.error('No se pudo instalar el curso de ejemplo', error));
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        theme={theme}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }}
      />
    </>
  );
}
