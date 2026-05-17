import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, placeholder = 'Selecione...', icon, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 12;
      const gap = 8;
      const estimatedHeight = Math.min(320, (options.length + 1) * 42 + 8);
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - gap - viewportPadding;
      const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const availableHeight = openUp ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(160, Math.min(320, availableHeight));
      const heightForPlacement = Math.min(estimatedHeight, maxHeight);
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - width - viewportPadding
      );
      const top = openUp
        ? Math.max(viewportPadding, rect.top - gap - heightForPlacement)
        : Math.min(rect.bottom + gap, window.innerHeight - heightForPlacement - viewportPadding);

      setPosition({
        position: 'fixed',
        top,
        left,
        width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, options.length]);

  const selectedOption = options.find(opt => opt.value === value);
  const dropdown = isOpen && position ? createPortal(
    <div
      ref={dropdownRef}
      style={position}
      className="z-[130] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1 overflow-y-auto custom-scrollbar"
    >
      <button
        type="button"
        onClick={() => { onChange(''); setIsOpen(false); }}
        className="w-full text-left px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors break-words"
      >
        {placeholder}
      </button>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => { onChange(option.value); setIsOpen(false); }}
          className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-3 ${
            value === option.value
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <span className="min-w-0 break-words">{option.label}</span>
          {value === option.value && <Check size={16} className="shrink-0" />}
        </button>
      ))}
    </div>,
    document.body
  ) : null;


  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all flex items-center justify-between gap-2 hover:bg-zinc-900"
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="text-zinc-500 shrink-0">{icon}</span>}
          <span className={`min-w-0 truncate ${selectedOption ? 'text-white' : 'text-zinc-500'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`text-zinc-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdown}
    </div>
  );
};
