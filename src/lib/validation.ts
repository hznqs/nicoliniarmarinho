const dateInputPattern = /^\d{4}-\d{2}-\d{2}$/;
const monthInputPattern = /^\d{4}-\d{2}$/;
const dataImagePattern = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/]+=*$/i;

const stripUnsafeTextChars = (value: string) => {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      const isControl = code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
      const isBidiOverride = (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
      return !isControl && !isBidiOverride;
    })
    .join('');
};

export const clampText = (value: string | undefined | null, maxLength = 160) => {
  return stripUnsafeTextChars(String(value ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
};

export const normalizeOptionalText = (value: string | undefined | null, maxLength = 500) => {
  const text = clampText(value, maxLength);
  return text || undefined;
};

export const assertRequiredText = (value: string | undefined | null, field: string, maxLength = 160) => {
  const text = clampText(value, maxLength);
  if (!text) throw new Error(`${field} é obrigatório.`);
  return text;
};

export const assertId = (value: string | undefined | null, field: string) => {
  const text = assertRequiredText(value, field, 80);
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(text)) {
    throw new Error(`${field} inválido.`);
  }
  return text;
};

export const assertDateInput = (value: string | undefined | null, field: string) => {
  const text = assertRequiredText(value, field, 10);
  if (!dateInputPattern.test(text) || Number.isNaN(new Date(`${text}T00:00:00`).getTime())) {
    throw new Error(`${field} deve ser uma data válida.`);
  }
  return text;
};

export const assertMonthInput = (value: string | undefined | null, field: string) => {
  const text = assertRequiredText(value, field, 7);
  if (!monthInputPattern.test(text)) {
    throw new Error(`${field} deve estar no formato AAAA-MM.`);
  }
  const month = Number(text.slice(5, 7));
  if (month < 1 || month > 12) {
    throw new Error(`${field} deve ter um mês válido.`);
  }
  return text;
};

export const assertMoney = (value: number, field: string) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${field} deve ser um valor maior ou igual a zero.`);
  }
  if (numberValue >= 10_000_000_000_000) {
    throw new Error(`${field} deve ser menor que R$ 10 trilhões.`);
  }
  return Math.round(numberValue * 100) / 100;
};

export const assertInteger = (value: number, field: string, min = 0) => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < min) {
    throw new Error(`${field} deve ser um número inteiro maior ou igual a ${min}.`);
  }
  return numberValue;
};

export const assertDayOfMonth = (value: number, field: string) => {
  const day = assertInteger(value, field, 1);
  if (day > 31) throw new Error(`${field} deve estar entre 1 e 31.`);
  return day;
};

export const sanitizeLogoDataUrl = (value: string | undefined | null) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.length > 120_000 || !dataImagePattern.test(text)) {
    throw new Error('Logotipo inválido. Use PNG, JPG ou WEBP com tamanho reduzido.');
  }
  return text;
};
