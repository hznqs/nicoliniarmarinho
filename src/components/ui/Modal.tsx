import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  return (
    <>
      {isOpen && (
        <>
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-2 sm:p-4 z-[70] pointer-events-none">
            <div
              className={`w-full ${maxWidth} max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden pointer-events-auto shadow-2xl rounded-2xl border flex flex-col`}
              style={{
                backgroundColor: 'var(--app-bg-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div
                className="flex items-center justify-between gap-4 p-6 border-b shrink-0"
                style={{ borderColor: 'var(--app-border)' }}
              >
                <h3
                  className="text-xl font-bold font-outfit"
                  style={{ color: 'var(--app-text-primary)' }}
                >
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="transition-colors rounded-lg p-2 hover:bg-black/10 shrink-0"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  <X size={22} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto overscroll-contain">
                {children}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
