import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateBR, formatDateInput } from '../../lib/date';

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const monthLabel = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const parseDateInput = (value?: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getCalendarDays = (viewDate: Date) => {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const getPopupPosition = (button: HTMLButtonElement) => {
  const rect = button.getBoundingClientRect();
  const margin = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isSmallViewport = viewportWidth <= 640;
  const width = Math.min(336, viewportWidth - margin * 2);
  const estimatedHeight = 390;

  if (isSmallViewport) {
    const mobileWidth = viewportWidth - margin * 2;
    const top = Math.min(
      Math.max(rect.bottom + margin, margin),
      Math.max(margin, viewportHeight - estimatedHeight - margin)
    );

    return {
      top,
      left: margin,
      width: mobileWidth,
      maxHeight: viewportHeight - margin * 2,
    };
  }

  const left = Math.min(Math.max(rect.right - width, margin), viewportWidth - width - margin);
  const hasRoomBelow = rect.bottom + margin + estimatedHeight <= viewportHeight;
  const top = hasRoomBelow
    ? rect.bottom + margin
    : Math.max(margin, rect.top - estimatedHeight - margin);

  return { top, left, width, maxHeight: viewportHeight - margin * 2 };
};

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Selecionar data',
  required,
  disabled,
  error,
  className = '',
  id,
}) => {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseDateInput(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, width: 336, maxHeight: 500 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        setPopupPosition(getPopupPosition(buttonRef.current));
      }
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const todayValue = formatDateInput();
  const selectedValue = selectedDate ? formatDateInput(selectedDate) : '';

  const moveMonth = (direction: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const toggleCalendar = () => {
    setIsOpen((current) => {
      const next = !current;
      if (next) {
        setViewDate(selectedDate || new Date());
        if (buttonRef.current) {
          setPopupPosition(getPopupPosition(buttonRef.current));
        }
      }
      return next;
    });
  };

  const selectDate = (date: Date) => {
    onChange(formatDateInput(date));
    setIsOpen(false);
  };

  return (
    <div className={`relative space-y-1.5 w-full ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={buttonId} className="text-sm font-medium ml-1" style={{ color: 'var(--app-text-muted)' }}>
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        disabled={disabled}
        onClick={toggleCalendar}
        className={`
          flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left transition-all
          hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
          ${disabled ? 'cursor-not-allowed opacity-60' : ''}
          ${error ? 'border-red-500/50' : 'border-zinc-800'}
        `}
        style={{
          backgroundColor: 'var(--app-input-bg)',
          color: value ? 'var(--app-text-primary)' : 'var(--app-text-placeholder)',
          borderColor: error ? undefined : 'var(--app-input-border)',
        }}
      >
        <span className="truncate text-sm">{value ? formatDateBR(value) : placeholder}</span>
        <CalendarDays size={18} className="shrink-0 text-primary" />
      </button>

      {isOpen && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[120] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl date-picker-popover"
          style={{
            top: popupPosition.top,
            left: popupPosition.left,
            width: popupPosition.width,
            maxHeight: popupPosition.maxHeight,
            backgroundColor: 'var(--app-bg-surface)',
            borderColor: 'var(--app-border)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
          }}
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-3">
            <button
              type="button"
              title="Mês anterior"
              onClick={() => moveMonth(-1)}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <strong className="text-sm font-bold text-white capitalize">
              {monthLabel(viewDate)}
            </strong>
            <button
              type="button"
              title="Próximo mês"
              onClick={() => moveMonth(1)}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1 pb-2">
            {weekdays.map((day, index) => (
              <div key={`${day}-${index}`} className="py-1 text-center text-[11px] font-bold uppercase text-zinc-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayValue = formatDateInput(day);
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = dayValue === selectedValue;
              const isToday = dayValue === todayValue;

              return (
                <button
                  key={dayValue}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`
                    flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-all
                    ${isSelected ? 'bg-primary text-black shadow-glow' : ''}
                    ${!isSelected && isToday ? 'border border-primary/50 text-primary' : ''}
                    ${!isSelected && !isToday && isCurrentMonth ? 'text-white hover:bg-white/5' : ''}
                    ${!isSelected && !isToday && !isCurrentMonth ? 'text-zinc-600 hover:bg-white/5 hover:text-zinc-400' : ''}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
            <button
              type="button"
              onClick={() => selectDate(new Date())}
              className="rounded-lg px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              Hoje
            </button>
            {!required && value && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={13} />
                Limpar
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
    </div>
  );
};
