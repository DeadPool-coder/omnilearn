import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './overlays';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

/** Hook de confirmación: const [confirm, dialog] = useConfirm(); if (await confirm({...})) … */
export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...opts, resolve }));
  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };
  const dialog = (
    <Dialog
      open={!!state}
      onClose={() => close(false)}
      title={state?.title ?? ''}
      description={state?.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {state?.confirmLabel ?? 'Confirmar'}
          </Button>
        </>
      }
    />
  );
  return [confirm, dialog];
}
