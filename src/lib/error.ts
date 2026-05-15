export const getErrorMessage = (error: unknown, fallback = 'Ocorreu um erro inesperado.') => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const postgrestError = error as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const message = typeof postgrestError.message === 'string' ? postgrestError.message : '';
    const details = typeof postgrestError.details === 'string' ? postgrestError.details : '';
    const hint = typeof postgrestError.hint === 'string' ? postgrestError.hint : '';
    const code = typeof postgrestError.code === 'string' ? postgrestError.code : '';

    if (message.includes('venda_itens') || details.includes('venda_itens')) {
      return [
        'O Supabase ainda está recusando a operação em venda_itens.',
        message,
        details,
        hint,
        code ? `Código: ${code}` : '',
      ].filter(Boolean).join(' ');
    }

    const parts = [message, details, hint, code ? `Código: ${code}` : ''].filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return fallback;
};
