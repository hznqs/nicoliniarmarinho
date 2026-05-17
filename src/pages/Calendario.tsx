import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Loader2,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { DataService } from '../lib/services';
import type { Cartao, CartaoFaturaPagamento, Compra, LancamentoFinanceiro } from '../lib/services';
import { dateInputTime, formatDateBR, formatDateInput, formatMonthInput } from '../lib/date';
import { getErrorMessage } from '../lib/error';
import { useConfirm } from '../contexts/confirm';
import { getCardInvoiceTotal } from '../lib/cardInvoices';

type CalendarEventType = 'boleto' | 'cartao' | 'financeiro' | 'compra';
type CalendarEventStatus = 'aberto' | 'vencido' | 'pago' | 'previsto';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  value: number;
  type: CalendarEventType;
  status: CalendarEventStatus;
  compraId?: string;
  cartaoId?: string;
  mes?: string;
  faturaPagaEm?: string;
}

const eventStatusLabels: Record<CalendarEventStatus, string> = {
  aberto: 'Aberto',
  vencido: 'Vencido',
  pago: 'Pago',
  previsto: 'Previsto',
};

const eventStyles: Record<CalendarEventType, { dot: string; badge: string; icon: typeof ReceiptText }> = {
  boleto: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: ReceiptText,
  },
  cartao: {
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: CreditCard,
  },
  financeiro: {
    dot: 'bg-sky-400',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    icon: Landmark,
  },
  compra: {
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: ShoppingBag,
  },
};

const getEventDot = (event: CalendarEvent) => {
  if (event.status === 'pago') return 'bg-emerald-400';
  if (event.status === 'vencido') return 'bg-rose-400';
  return eventStyles[event.type].dot;
};

const getEventBadge = (event: CalendarEvent) => {
  if (event.status === 'pago') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (event.status === 'vencido') return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
  return eventStyles[event.type].badge;
};

const tipoFinanceiroLabels: Record<string, string> = {
  custo_fixo: 'Custo fixo',
  prolabore: 'Pró-labore',
  distribuicao_lucro: 'Distribuição de lucro',
};

const today = formatDateInput();

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const parseMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1);
};

const getDaysInMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0).getDate();
};

const buildDateForMonth = (month: string, day = 1) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const safeDay = Math.min(Math.max(day, 1), getDaysInMonth(month));
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

const getCalendarDays = (month: string) => {
  const firstDay = parseMonth(month);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDateInput(date);
  });
};

const monthTitle = (month: string) => {
  const date = parseMonth(month);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};

const moveMonth = (month: string, direction: number) => {
  const date = parseMonth(month);
  date.setMonth(date.getMonth() + direction);
  return formatMonthInput(date);
};

const getBoletoStatus = (compra: Compra, dueDate: string): CalendarEventStatus => {
  if (compra.boletoPago) return 'pago';
  return dueDate < today ? 'vencido' : 'aberto';
};

const isPendingEvent = (event: CalendarEvent) => event.status !== 'pago' && event.value > 0;

const buildEvents = (
  compras: Compra[],
  cartoes: Cartao[],
  lancamentos: LancamentoFinanceiro[],
  faturaPagamentos: CartaoFaturaPagamento[],
  month: string
) => {
  const events: CalendarEvent[] = [];
  const faturaPagamentosByCard = new Map(
    faturaPagamentos
      .filter((pagamento) => pagamento.mes === month)
      .map((pagamento) => [`${pagamento.cartaoId}:${pagamento.mes}`, pagamento])
  );

  compras.forEach((compra) => {
    if (compra.formaPagamento === 'boleto' && compra.boletoVencimento?.startsWith(month)) {
      events.push({
        id: `boleto-${compra.id}`,
        date: compra.boletoVencimento,
        title: compra.fornecedores?.nome || 'Boleto sem fornecedor',
        subtitle: compra.descricao || 'Vencimento de boleto',
        value: compra.valor,
        type: 'boleto',
        status: getBoletoStatus(compra, compra.boletoVencimento),
        compraId: compra.boletoPago ? undefined : compra.id,
      });
      return;
    }

    if (compra.formaPagamento === 'avista' && compra.data.startsWith(month)) {
      events.push({
        id: `compra-${compra.id}`,
        date: compra.data,
        title: compra.fornecedores?.nome || 'Compra registrada',
        subtitle: 'Compra à vista',
        value: compra.valor,
        type: 'compra',
        status: 'pago',
      });
    }
  });

  cartoes.forEach((cartao) => {
    const dueDate = buildDateForMonth(month, cartao.vencimento || 10);
    const fatura = getCardInvoiceTotal(compras, cartao, month);
    const pagamento = faturaPagamentosByCard.get(`${cartao.id}:${month}`);
    const status: CalendarEventStatus = pagamento
      ? 'pago'
      : dueDate < today && fatura > 0
        ? 'vencido'
        : fatura > 0
          ? 'aberto'
          : 'previsto';

    events.push({
      id: `cartao-${cartao.id}-${month}`,
      date: dueDate,
      title: cartao.nome,
      subtitle: pagamento
        ? `Fatura paga em ${formatDateBR(pagamento.dataPagamento)}`
        : fatura > 0
          ? 'Vencimento da fatura'
          : 'Vencimento do cartão',
      value: fatura,
      type: 'cartao',
      status,
      cartaoId: cartao.id,
      mes: month,
      faturaPagaEm: pagamento?.dataPagamento,
    });
  });

  lancamentos.forEach((item) => {
    const itemMonth = item.data.slice(0, 7);
    const shouldShow = item.recorrente ? itemMonth <= month : itemMonth === month;
    if (!shouldShow) return;

    const [, , originalDay] = item.data.split('-').map(Number);
    const eventDate = item.recorrente ? buildDateForMonth(month, originalDay) : item.data;

    events.push({
      id: `financeiro-${item.id}-${item.recorrente ? month : item.data}`,
      date: eventDate,
      title: item.descricao,
      subtitle: `${tipoFinanceiroLabels[item.tipo] || 'Financeiro'}${item.categoria ? ` · ${item.categoria}` : ''}`,
      value: item.valor,
      type: 'financeiro',
      status: eventDate < today ? 'vencido' : 'previsto',
    });
  });

  return events.sort((a, b) => dateInputTime(a.date) - dateInputTime(b.date) || b.value - a.value);
};

export const Calendario = () => {
  const confirm = useConfirm();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [faturaPagamentos, setFaturaPagamentos] = useState<CartaoFaturaPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(formatMonthInput());
  const [selectedDate, setSelectedDate] = useState(formatDateInput());
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    try {
      setError(null);
      const [comprasData, cartoesData, lancamentosData, faturaPagamentosData] = await Promise.all([
        DataService.getCompras(),
        DataService.getCartoes(),
        DataService.getLancamentosFinanceiros().catch(() => [] as LancamentoFinanceiro[]),
        DataService.getCartaoFaturaPagamentos().catch(() => [] as CartaoFaturaPagamento[]),
      ]);
      setCompras(comprasData);
      setCartoes(cartoesData);
      setLancamentos(lancamentosData);
      setFaturaPagamentos(faturaPagamentosData);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar o calendário financeiro.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const events = useMemo(() => {
    return buildEvents(compras, cartoes, lancamentos, faturaPagamentos, viewMonth).filter((event) => {
      const matchType = typeFilter ? event.type === typeFilter : true;
      const matchStatus = statusFilter ? event.status === statusFilter : true;
      return matchType && matchStatus;
    });
  }, [cartoes, compras, faturaPagamentos, lancamentos, statusFilter, typeFilter, viewMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const current = map.get(event.date) || [];
      current.push(event);
      map.set(event.date, current);
    });
    return map;
  }, [events]);

  const selectedEvents = eventsByDay.get(selectedDate) || [];
  const selectedPendingEvents = selectedEvents.filter(isPendingEvent);
  const selectedOtherEvents = selectedEvents.filter((event) => !isPendingEvent(event));
  const selectedPendingTotal = selectedPendingEvents.reduce((acc, event) => acc + event.value, 0);
  const monthDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);
  const summary = useMemo(() => {
    return events.reduce((acc, event) => {
      if (event.status !== 'pago') acc.pendente += event.value;
      if (event.status === 'vencido') acc.vencido += event.value;
      if (event.status === 'pago') acc.pago += event.value;
      return acc;
    }, { pendente: 0, vencido: 0, pago: 0 });
  }, [events]);

  const handlePayBoleto = async (event: CalendarEvent) => {
    if (!event.compraId) return;
    const ok = await confirm({
      title: 'Pagar boleto?',
      message: 'Este boleto será marcado como pago e sairá das pendências do calendário.',
      confirmLabel: 'Pagar boleto',
      tone: 'success',
    });
    if (!ok) return;

    try {
      await DataService.setBoletoPago(event.compraId, true);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível pagar este boleto.'));
    }
  };

  const handlePayCardInvoice = async (event: CalendarEvent) => {
    if (!event.cartaoId || !event.mes) return;
    const ok = await confirm({
      title: 'Pagar fatura?',
      message: 'Esta fatura será marcada como paga e ficará em verde no calendário.',
      confirmLabel: 'Pagar fatura',
      tone: 'success',
    });
    if (!ok) return;

    try {
      await DataService.setCartaoFaturaPago(event.cartaoId, event.mes, event.value);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível pagar esta fatura.'));
    }
  };

  const handleReopenCardInvoice = async (event: CalendarEvent) => {
    if (!event.cartaoId || !event.mes) return;
    const ok = await confirm({
      title: 'Reabrir fatura?',
      message: 'A fatura voltará a aparecer como pendente no calendário.',
      confirmLabel: 'Reabrir fatura',
      tone: 'warning',
    });
    if (!ok) return;

    try {
      await DataService.reabrirCartaoFatura(event.cartaoId, event.mes);
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível reabrir esta fatura.'));
    }
  };

  const changeMonth = (direction: number) => {
    const nextMonth = moveMonth(viewMonth, direction);
    setViewMonth(nextMonth);
    setSelectedDate(buildDateForMonth(nextMonth, 1));
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Calendário Financeiro</h1>
          <p className="text-zinc-400">Vencimentos, boletos, cartões e compromissos financeiros em uma visão mensal.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Todos os tipos"
            options={[
              { value: 'boleto', label: 'Boletos' },
              { value: 'cartao', label: 'Cartões' },
              { value: 'financeiro', label: 'Financeiro' },
              { value: 'compra', label: 'Compras' },
            ]}
            className="w-full sm:w-48"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Todos status"
            options={[
              { value: 'aberto', label: 'Abertos' },
              { value: 'vencido', label: 'Vencidos' },
              { value: 'pago', label: 'Pagos' },
              { value: 'previsto', label: 'Previstos' },
            ]}
            className="w-full sm:w-48"
          />
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <section className="summary-card-grid grid gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 min-w-0 overflow-hidden">
          <span className="text-xs font-semibold uppercase text-zinc-500">Pendências do mês</span>
          <div className="mt-3 flex items-center justify-between gap-3">
            <strong className="money-text stat-card-value text-2xl font-bold text-white">{formatCurrency(summary.pendente)}</strong>
            <CalendarCheck className="text-primary shrink-0" size={22} />
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 min-w-0 overflow-hidden">
          <span className="text-xs font-semibold uppercase text-zinc-500">Vencidos</span>
          <div className="mt-3 flex items-center justify-between gap-3">
            <strong className="money-text stat-card-value text-2xl font-bold text-rose-400">{formatCurrency(summary.vencido)}</strong>
            <AlertTriangle className="text-rose-400 shrink-0" size={22} />
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 min-w-0 overflow-hidden">
          <span className="text-xs font-semibold uppercase text-zinc-500">Já pagos</span>
          <div className="mt-3 flex items-center justify-between gap-3">
            <strong className="money-text stat-card-value text-2xl font-bold text-emerald-400">{formatCurrency(summary.pago)}</strong>
            <CheckCircle2 className="text-emerald-400 shrink-0" size={22} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <section className="calendar-panel bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden min-w-0">
          <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 sm:flex sm:gap-3 min-w-0 w-full sm:w-auto">
              <button
                type="button"
                title="Mês anterior"
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-center sm:text-left text-xl font-bold text-white font-outfit capitalize min-w-0">
                {monthTitle(viewMonth)}
              </h2>
              <button
                type="button"
                title="Próximo mês"
                onClick={() => changeMonth(1)}
                className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CalendarDays size={16} />}
              onClick={() => { setViewMonth(formatMonthInput()); setSelectedDate(formatDateInput()); }}
            >
              Hoje
            </Button>
          </div>

          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/60">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="px-2 py-3 text-center text-[11px] font-bold uppercase text-zinc-500">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-grid-scroll">
            <div className="grid grid-cols-1 sm:grid-cols-7">
              {monthDays.map((day) => {
                const dayEvents = eventsByDay.get(day) || [];
                const pendingEvents = dayEvents.filter(isPendingEvent);
                const overdueEvents = pendingEvents.filter((event) => event.status === 'vencido');
                const isCurrentMonth = day.startsWith(viewMonth);
                const isSelected = day === selectedDate;
                const isToday = day === today;
                const [, , dayNumber] = day.split('-').map(Number);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={`
                      calendar-day-cell min-h-[7.5rem] border-b border-zinc-800 p-3 text-left transition-colors sm:border-r
                      hover:bg-white/5
                      ${isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary/50' : ''}
                      ${!isSelected && overdueEvents.length ? 'bg-rose-500/5' : ''}
                      ${!isSelected && !overdueEvents.length && pendingEvents.length ? 'bg-amber-500/5' : ''}
                      ${!isCurrentMonth ? 'bg-black/10 opacity-55' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                        isToday ? 'bg-primary text-black' : 'text-white'
                      }`}>
                        {dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className={`text-[11px] font-bold ${
                          overdueEvents.length ? 'text-rose-400' : pendingEvents.length ? 'text-amber-400' : 'text-zinc-500'
                        }`}>
                          {pendingEvents.length
                            ? `${pendingEvents.length} pend.`
                            : `${dayEvents.length} item${dayEvents.length > 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>

                    {pendingEvents.length > 0 && (
                      <div className={`mb-2 rounded-lg border px-2 py-1 ${
                        overdueEvents.length
                          ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                      }`}>
                        <span className="block text-center text-[10px] font-bold uppercase">
                          {overdueEvents.length ? 'Vencido' : 'Pendente'}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {dayEvents.slice(0, pendingEvents.length ? 2 : 3).map((event) => (
                        <div key={event.id} className="flex items-center gap-1.5 min-w-0">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${getEventDot(event)}`} />
                          <span className={`truncate text-[11px] ${event.status === 'pago' ? 'text-emerald-300' : 'text-zinc-300'}`}>
                            {event.title}
                          </span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[11px] font-semibold text-primary">+{dayEvents.length - 3} outros</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden min-w-0 h-fit">
          <div className="p-5 border-b border-zinc-800 bg-zinc-800/20">
            <span className="text-xs font-semibold uppercase text-zinc-500">Agenda do dia</span>
            <h3 className="mt-1 text-xl font-bold text-white font-outfit">{formatDateBR(selectedDate)}</h3>
            {selectedPendingEvents.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase text-amber-300">
                    {selectedPendingEvents.length} pendência{selectedPendingEvents.length > 1 ? 's' : ''}
                  </span>
                  <span className="money-text text-sm font-bold text-amber-200">
                    {formatCurrency(selectedPendingTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3 max-h-[680px] overflow-y-auto">
            {selectedEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                <CalendarDays className="mx-auto mb-3 text-zinc-600" size={34} />
                <p className="text-sm font-medium text-zinc-500">Nenhum compromisso financeiro neste dia.</p>
              </div>
            ) : (
              <>
                {selectedPendingEvents.length > 0 && (
                  <div className="pb-1">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-amber-300">
                      <AlertTriangle size={14} />
                      Pendências do dia
                    </div>
                    <div className="space-y-3">
                      {selectedPendingEvents.map((event) => {
                        const Icon = eventStyles[event.type].icon;
                        return (
                          <div key={event.id} className={`rounded-2xl border p-4 ${
                            event.status === 'vencido'
                              ? 'border-rose-500/30 bg-rose-500/10'
                              : 'border-amber-500/25 bg-amber-500/10'
                          }`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={`p-2 rounded-xl shrink-0 ${getEventBadge(event)}`}>
                                  <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate">{event.title}</p>
                                  <p className="text-xs text-zinc-400 mt-1">{event.subtitle}</p>
                                </div>
                              </div>
                              <span className={`text-[11px] px-2 py-1 rounded-full border font-bold shrink-0 ${
                                event.status === 'vencido'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                                  : getEventBadge(event)
                              }`}>
                                {eventStatusLabels[event.status]}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <span className="money-text text-lg font-bold text-white">{formatCurrency(event.value)}</span>
                              {event.compraId && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="success"
                                  leftIcon={<CheckCircle2 size={16} />}
                                  onClick={() => handlePayBoleto(event)}
                                >
                                  Pagar boleto
                                </Button>
                              )}
                              {!event.compraId && event.type === 'cartao' && event.cartaoId && event.mes && event.value > 0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="success"
                                  leftIcon={<CheckCircle2 size={16} />}
                                  onClick={() => handlePayCardInvoice(event)}
                                >
                                  Pagar fatura
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedOtherEvents.length > 0 && (
                  <div className={selectedPendingEvents.length ? 'pt-3 border-t border-zinc-800' : ''}>
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-zinc-500">
                      <CheckCircle2 size={14} />
                      Pagos e registros
                    </div>
                    <div className="space-y-3">
                      {selectedOtherEvents.map((event) => {
                const Icon = eventStyles[event.type].icon;
                return (
                  <div key={event.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${getEventBadge(event)}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{event.title}</p>
                          <p className="text-xs text-zinc-500 mt-1">{event.subtitle}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full border font-bold shrink-0 ${getEventBadge(event)}`}>
                        {eventStatusLabels[event.status]}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="money-text text-lg font-bold text-white">{formatCurrency(event.value)}</span>
                      {event.compraId && (
                        <Button
                          type="button"
                          size="sm"
                          variant="success"
                          leftIcon={<CheckCircle2 size={16} />}
                          onClick={() => handlePayBoleto(event)}
                        >
                          Pagar boleto
                        </Button>
                      )}
                      {event.type === 'cartao' && event.status === 'pago' && event.cartaoId && event.mes && event.value > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          leftIcon={<RotateCcw size={16} />}
                          onClick={() => handleReopenCardInvoice(event)}
                        >
                          Reabrir fatura
                        </Button>
                      )}
                    </div>
                  </div>
                );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
