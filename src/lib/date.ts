const pad2 = (value: number) => String(value).padStart(2, '0');

export const formatDateInput = (date = new Date()) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const formatMonthInput = (date = new Date()) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
};

export const formatDateBR = (value?: string | null) => {
  if (!value) return '';
  const [datePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);

  if (year && month && day) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
  }

  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
};

export const dateInputTime = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
};
