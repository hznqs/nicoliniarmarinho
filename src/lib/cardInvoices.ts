type CardPurchase = {
  id: string;
  data: string;
  valor: number;
  cartaoId?: string | null;
  parcelas?: number | null;
};

type CardConfig = {
  id: string;
  fechamento?: number;
  vencimento?: number;
};

export interface CardInvoiceInstallment<TCompra extends CardPurchase = CardPurchase> {
  compra: TCompra;
  mes: string;
  parcela: number;
  parcelas: number;
  valor: number;
}

const pad2 = (value: number) => String(value).padStart(2, '0');

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

export const addMonthsToMonth = (month: string, offset: number) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
};

const normalizeCardDay = (day: number | undefined, fallback: number) => Math.min(Math.max(day || fallback, 1), 31);

const getCardClosingMonth = (purchaseDate: string, closingDay = 1) => {
  const [year, monthNumber, day] = purchaseDate.split('-').map(Number);
  const safeClosingDay = Math.min(normalizeCardDay(closingDay, 1), daysInMonth(year, monthNumber));
  const invoiceDate = new Date(year, monthNumber - 1, 1);
  if (day > safeClosingDay) {
    invoiceDate.setMonth(invoiceDate.getMonth() + 1);
  }
  return `${invoiceDate.getFullYear()}-${pad2(invoiceDate.getMonth() + 1)}`;
};

export const getCardInvoiceMonth = (purchaseDate: string, closingDay = 1, dueDay = 10) => {
  const closingMonth = getCardClosingMonth(purchaseDate, closingDay);
  const normalizedClosingDay = normalizeCardDay(closingDay, 1);
  const normalizedDueDay = normalizeCardDay(dueDay, 10);
  const dueMonthOffset = normalizedDueDay <= normalizedClosingDay ? 1 : 0;
  return addMonthsToMonth(closingMonth, dueMonthOffset);
};

export const buildDateForMonthDay = (month: string, day = 1) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const safeDay = Math.min(normalizeCardDay(day, 1), daysInMonth(year, monthNumber));
  return `${year}-${pad2(monthNumber)}-${pad2(safeDay)}`;
};

export const getCardInvoiceDueDate = (purchaseDate: string, closingDay = 1, dueDay = 10) => {
  return buildDateForMonthDay(getCardInvoiceMonth(purchaseDate, closingDay, dueDay), dueDay);
};

export const getCardPurchaseInstallments = <TCompra extends CardPurchase>(
  compra: TCompra,
  cartao: CardConfig
): CardInvoiceInstallment<TCompra>[] => {
  if (!compra.cartaoId || compra.cartaoId !== cartao.id) return [];

  const parcelas = Math.max(1, Math.min(120, Math.trunc(Number(compra.parcelas || 1))));
  const firstMonth = getCardInvoiceMonth(compra.data, cartao.fechamento || 1, cartao.vencimento || 10);
  const totalCents = Math.round(Number(compra.valor || 0) * 100);
  const baseCents = Math.floor(totalCents / parcelas);
  const remainder = totalCents % parcelas;

  return Array.from({ length: parcelas }, (_, index) => ({
    compra,
    mes: addMonthsToMonth(firstMonth, index),
    parcela: index + 1,
    parcelas,
    valor: (baseCents + (index < remainder ? 1 : 0)) / 100,
  }));
};

export const getCardInvoiceInstallments = <TCompra extends CardPurchase>(
  compras: TCompra[],
  cartao: CardConfig,
  month: string
) => compras.flatMap((compra) => getCardPurchaseInstallments(compra, cartao))
  .filter((installment) => installment.mes === month);

export const getCardInvoiceTotal = <TCompra extends CardPurchase>(
  compras: TCompra[],
  cartao: CardConfig,
  month: string
) => getCardInvoiceInstallments(compras, cartao, month)
  .reduce((acc, installment) => acc + installment.valor, 0);
