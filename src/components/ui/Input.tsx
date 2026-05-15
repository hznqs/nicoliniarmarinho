import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', style, ...props }) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          className="text-sm font-medium ml-1"
          style={{ color: 'var(--app-text-muted)' }}
        >
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all border ${error ? 'border-red-500/50 focus:border-red-500/50' : ''} ${className}`}
        style={{
          backgroundColor: 'var(--app-input-bg)',
          color: 'var(--app-text-primary)',
          borderColor: error ? undefined : 'var(--app-input-border)',
          ...style,
        }}
        {...props}
      />
      {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
    </div>
  );
};
