import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  leftIcon,
  className = '',
  fullWidth,
  ...props 
}) => {
  const variants = {
    primary: 'bg-primary text-black hover:shadow-glow',
    outline: 'border border-zinc-800 text-zinc-400 hover:text-white hover:bg-white/5',
    ghost: 'text-zinc-400 hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white',
    success: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button 
      className={`
        inline-flex min-h-11 max-w-full min-w-0 items-center justify-center gap-2 rounded-xl font-semibold leading-tight transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}
      `}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span className="min-w-0 max-w-full whitespace-normal text-center">{children}</span>
        </>
      )}
    </button>
  );
};
