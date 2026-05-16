import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmContext } from './confirm';
import type { ConfirmOptions, ConfirmTone } from './confirm';

interface PendingConfirm extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void;
}

const toneConfig: Record<ConfirmTone, {
  icon: typeof AlertTriangle;
  iconClass: string;
  confirmVariant: 'primary' | 'danger' | 'success' | 'outline';
}> = {
  danger: {
    icon: Trash2,
    iconClass: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    confirmVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    confirmVariant: 'primary',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    confirmVariant: 'success',
  },
  neutral: {
    icon: RotateCcw,
    iconClass: 'bg-primary/10 text-primary border-primary/25',
    confirmVariant: 'primary',
  },
};

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        tone: options.tone || 'warning',
        resolve,
      });
    });
  }, []);

  const close = (result: boolean) => {
    if (!pending) return;
    pending.resolve(result);
    setPending(null);
  };

  const value = useMemo(() => confirm, [confirm]);
  const ToneIcon = pending ? toneConfig[pending.tone].icon : AlertTriangle;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <>
          <div
            className="fixed inset-0 z-[130] bg-black/65 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-3 pointer-events-none">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl pointer-events-auto overflow-hidden"
              style={{
                backgroundColor: 'var(--app-bg-surface)',
                borderColor: 'var(--app-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
              }}
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 ${toneConfig[pending.tone].iconClass}`}>
                    <ToneIcon size={24} />
                  </div>
                  <button
                    type="button"
                    title="Cancelar"
                    onClick={() => close(false)}
                    className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X size={19} />
                  </button>
                </div>

                <div className="mt-5">
                  <h2 className="text-xl font-bold text-white font-outfit">
                    {pending.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {pending.message}
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => close(false)}
                    className="w-full sm:w-auto"
                  >
                    {pending.cancelLabel}
                  </Button>
                  <Button
                    type="button"
                    variant={toneConfig[pending.tone].confirmVariant}
                    onClick={() => close(true)}
                    className="w-full sm:w-auto"
                  >
                    {pending.confirmLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
};
