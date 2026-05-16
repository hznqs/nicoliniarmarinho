import React, { useId } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  onCheckedChange: (checked: boolean) => void;
  align?: 'start' | 'between';
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  checked,
  onCheckedChange,
  align = 'start',
  className = '',
  id,
  disabled,
  ...props
}) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;

  return (
    <label
      htmlFor={checkboxId}
      className={`
        group relative flex cursor-pointer gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition-all
        hover:border-primary/50 hover:bg-zinc-900/80
        ${align === 'between' ? 'items-center justify-between' : 'items-start'}
        ${disabled ? 'cursor-not-allowed opacity-60' : ''}
        ${className}
      `}
    >
      <span className={`min-w-0 ${align === 'between' ? 'order-1' : 'order-2 flex-1'}`}>
        <span className="block text-sm font-semibold text-white">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
            {description}
          </span>
        )}
      </span>

      <span
        className={`
          order-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all
          group-focus-within:ring-2 group-focus-within:ring-primary/25
          ${checked
            ? 'border-primary bg-primary text-black shadow-glow'
            : 'border-zinc-700 bg-zinc-900 text-transparent group-hover:border-primary/70'
          }
          ${align === 'between' ? 'order-2' : ''}
        `}
      >
        <Check size={14} strokeWidth={3} />
      </span>

      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="sr-only"
        {...props}
      />
    </label>
  );
};
