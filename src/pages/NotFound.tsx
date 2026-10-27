import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        icon={<Compass className="size-5" />}
        title="Página no encontrada"
        description="Esta dirección no existe. Quizá la ruta o la lección se eliminó."
        action={
          <Link to="/">
            <Button variant="secondary">Volver al inicio</Button>
          </Link>
        }
      />
    </Page>
  );
}
