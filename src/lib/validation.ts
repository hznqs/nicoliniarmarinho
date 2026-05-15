export const clampText = (value: string | undefined | null, maxLength = 160) => {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
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

export const assertMoney = (value: number, field: string) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${field} deve ser um valor maior ou igual a zero.`);
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
