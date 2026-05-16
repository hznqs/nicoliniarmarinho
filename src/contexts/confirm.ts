import { createContext, useContext } from 'react';

export type ConfirmTone = 'danger' | 'warning' | 'success' | 'neutral';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm deve ser usado dentro de ConfirmProvider.');
  return confirm;
};
