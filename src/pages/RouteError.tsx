import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Pantalla de error de último recurso (fallo inesperado al renderizar una página). */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Error desconocido';
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6 text-fg">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-xl bg-danger-soft text-danger">
          <TriangleAlert className="size-5" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Algo salió mal</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Tus datos están a salvo en este navegador. Recarga la página o vuelve al inicio.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-3 text-left text-xs text-fg-muted">
          {message}
        </pre>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Recargar
          </Button>
          <Link to="/">
            <Button variant="primary">Ir al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
