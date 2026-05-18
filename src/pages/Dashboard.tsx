import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingBag, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Boxes,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  PackageSearch,
  Target,
  Trophy,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DataService } from '../lib/services';
import type { Venda, Compra, Produto, Cartao, CartaoFaturaPagamento } from '../lib/services';
import type { DashboardChartsData } from '../components/dashboard/ChartsPanel';
import { dateInputTime, formatDateBR, formatDateInput, formatMonthInput } from '../lib/date';
import { DatePicker } from '../components/ui/DatePicker';
import { Select } from '../components/ui/Select';
import { buildDateForMonthDay, getCardInvoiceTotal, getCardPurchaseInstallments } from '../lib/cardInvoices';

const ChartsPanel = lazy(() => import('../components/dashboard/ChartsPanel').then((m) => ({ default: m.ChartsPanel })));

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { positive: boolean; value: string };
  color: string;
  subtitle: string;
}

interface DashboardStats {
  totalVendas: number;
  totalCompras: number;
  saldo: number;
  faturasValor: number;
  produtosAtivos: number;
  baixoEstoque: number;
  valorEstoque: number;
}

type PeriodFilter = 'today' | 'day' | 'month' | 'last3' | 'last6' | 'year' | 'all';

interface PeriodRange {
  start: string;
  end: string;
  label: string;
  shortLabel: string;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  meta: string;
  status: 'danger' | 'warning' | 'success' | 'neutral';
  to: string;
}

interface BestSeller {
  produtoId: string;
  nome: string;
  quantidade: number;
  receita: number;
}

interface ActivityItem {
  id: string;
  type: 'venda' | 'compra';
  title: string;
  date: string;
  value: number;
  to: string;
}

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const parseMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1);
};

const endOfMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return formatDateInput(new Date(year, monthNumber, 0));
};

const daysInMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0).getDate();
};

const buildDateForMonth = (month: string, day = 1) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const safeDay = Math.min(Math.max(day, 1), daysInMonth(month));
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

const addMonths = (date: Date, amount: number) => {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
};

const formatMonthLabel = (month: string) => {
  const date = parseMonth(month);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(date)
    .replace(/^./, (str) => str.toUpperCase());
};

const getPeriodRange = (filter: PeriodFilter, selectedDay: string, selectedMonth: string): PeriodRange => {
  const today = new Date();
  const todayInput = formatDateInput(today);
  const currentMonth = formatMonthInput(today);

  if (filter === 'today') {
    return { start: todayInput, end: todayInput, label: 'Hoje', shortLabel: 'Hoje' };
  }

  if (filter === 'day') {
    return { start: selectedDay, end: selectedDay, label: `Dia ${selectedDay.split('-').reverse().join('/')}`, shortLabel: 'Dia selecionado' };
  }

  if (filter === 'last3') {
    const startMonth = formatMonthInput(addMonths(today, -2));
    return { start: `${startMonth}-01`, end: endOfMonth(currentMonth), label: 'Últimos 3 meses', shortLabel: '3 meses' };
  }

  if (filter === 'last6') {
    const startMonth = formatMonthInput(addMonths(today, -5));
    return { start: `${startMonth}-01`, end: endOfMonth(currentMonth), label: 'Últimos 6 meses', shortLabel: '6 meses' };
  }

  if (filter === 'year') {
    const year = today.getFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: `Ano de ${year}`, shortLabel: 'Ano atual' };
  }

  if (filter === 'all') {
    return { start: '', end: '', label: 'Todo o histórico', shortLabel: 'Histórico' };
  }

  return { start: `${selectedMonth}-01`, end: endOfMonth(selectedMonth), label: formatMonthLabel(selectedMonth), shortLabel: 'Mês selecionado' };
};

const isInRange = (date: string, range: PeriodRange) => {
  return (!range.start || date >= range.start) && (!range.end || date <= range.end);
};

const buildDailyChart = (vendas: Venda[], compras: Compra[], cartoes: Cartao[], range: PeriodRange) => {
  const cardInstallments = cartoes.flatMap((cartao) => (
    compras.flatMap((compra) => getCardPurchaseInstallments(compra, cartao).map((installment) => ({
      ...installment,
      dueDate: buildDateForMonthDay(installment.mes, cartao.vencimento || 10),
    })))
  ));
  const today = formatDateInput();
  const end = range.end || today;
  const start = range.start || (() => {
    const firstDate = [
      ...vendas.map((v) => v.data),
      ...compras.filter((c) => !c.cartaoId).map((c) => c.data),
      ...cardInstallments.map((installment) => installment.dueDate),
    ].sort()[0];
    return firstDate || today;
  })();
  const totalDays = Math.max(1, Math.floor((dateInputTime(end) - dateInputTime(start)) / 86_400_000) + 1);
  const visibleDays = Math.min(totalDays, 31);
  const chartStart = new Date(dateInputTime(end));
  chartStart.setDate(chartStart.getDate() - visibleDays + 1);

  return Array.from({ length: visibleDays }, (_, index) => {
    const date = new Date(chartStart);
    date.setDate(chartStart.getDate() + index);
    const dateStr = formatDateInput(date);
    const displayStr = `${date.getDate()}/${date.getMonth() + 1}`;

    return {
      name: displayStr,
      Vendas: vendas.filter((v) => v.data === dateStr).reduce((acc, v) => acc + v.valor, 0),
      Compras: compras.filter((c) => !c.cartaoId && c.data === dateStr).reduce((acc, c) => acc + c.valor, 0)
        + cardInstallments.filter((installment) => installment.dueDate === dateStr).reduce((acc, installment) => acc + installment.valor, 0),
    };
  });
};

const buildMonthlyChart = (vendas: Venda[], compras: Compra[], cartoes: Cartao[], range: PeriodRange) => {
  const cardInstallments = cartoes.flatMap((cartao) => (
    compras.flatMap((compra) => getCardPurchaseInstallments(compra, cartao))
  ));
  const isMonthInRange = (month: string) => {
    const monthStart = `${month}-01`;
    const monthEnd = endOfMonth(month);
    return (!range.start || monthEnd >= range.start) && (!range.end || monthStart <= range.end);
  };
  const months = Array.from(new Set([
    ...vendas.filter((v) => isInRange(v.data, range)).map((v) => v.data.slice(0, 7)),
    ...compras.filter((c) => !c.cartaoId && isInRange(c.data, range)).map((c) => c.data.slice(0, 7)),
    ...cardInstallments
      .filter((installment) => isMonthInRange(installment.mes))
      .map((installment) => installment.mes),
  ])).sort();

  const visibleMonths = months.length ? months.slice(-12) : [formatMonthInput()];

  return visibleMonths.map((month) => ({
    name: monthNames[parseMonth(month).getMonth()],
    Entradas: vendas.filter((v) => v.data.startsWith(month)).reduce((acc, v) => acc + v.valor, 0),
    Saídas: compras.filter((c) => !c.cartaoId && c.data.startsWith(month)).reduce((acc, c) => acc + c.valor, 0)
      + cardInstallments.filter((installment) => installment.mes === month).reduce((acc, installment) => acc + installment.valor, 0),
  }));
};

const actionStatusClass: Record<ActionItem['status'], string> = {
  danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  neutral: 'border-zinc-800 bg-zinc-950/40 text-zinc-300',
};

const getDaysUntil = (date: string) => {
  return Math.ceil((dateInputTime(date) - dateInputTime(formatDateInput())) / 86_400_000);
};

const dueDateLabel = (date: string) => {
  const days = getDaysUntil(date);
  if (days < 0) return `Venceu há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Vence hoje';
  return `Vence em ${days} dia${days === 1 ? '' : 's'}`;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const loadPeriodGoal = () => {
  const stored = Number(localStorage.getItem('dashboard-period-goal') || 0);
  return Number.isFinite(stored) && stored >= 0 ? stored : 0;
};

const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: StatCardProps) => (
  <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl min-w-0 overflow-hidden">
    <div className="flex items-center justify-between gap-3 mb-4 min-w-0">
      <span className="text-zinc-400 text-sm font-medium truncate">{title}</span>
      <div className={`p-2 rounded-lg shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="flex flex-col min-w-0">
      <h3 className="money-text stat-card-value text-2xl font-bold text-white mb-1">{value}</h3>
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {trend && (
          <span className={`text-xs flex items-center shrink-0 ${trend.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend.value}
          </span>
        )}
        <span className="text-zinc-500 text-xs min-w-0">{subtitle}</span>
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [selectedDay, setSelectedDay] = useState(formatDateInput());
  const [selectedMonth, setSelectedMonth] = useState(formatMonthInput());
  const [periodGoal, setPeriodGoal] = useState(loadPeriodGoal);
  const [data, setData] = useState<{
    vendas: Venda[],
    compras: Compra[],
    produtos: Produto[],
    cartoes: Cartao[],
    faturaPagamentos: CartaoFaturaPagamento[],
  }>({
    vendas: [],
    compras: [],
    produtos: [],
    cartoes: [],
    faturaPagamentos: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendas, compras, produtos, cartoes, faturaPagamentos] = await Promise.all([
          DataService.getVendas(),
          DataService.getCompras(),
          DataService.getProdutos().catch(() => [] as Produto[]),
          DataService.getCartoes().catch(() => [] as Cartao[]),
          DataService.getCartaoFaturaPagamentos().catch(() => [] as CartaoFaturaPagamento[]),
        ]);

        setData({
          vendas,
          compras,
          produtos,
          cartoes,
          faturaPagamentos,
        });
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard-period-goal', String(periodGoal));
  }, [periodGoal]);

  const periodRange = useMemo(
    () => getPeriodRange(periodFilter, selectedDay, selectedMonth),
    [periodFilter, selectedDay, selectedMonth]
  );

  const monthOptions = useMemo(() => {
    const months = Array.from(new Set([
      formatMonthInput(),
      ...data.vendas.map((v) => v.data.slice(0, 7)),
      ...data.compras.map((c) => c.data.slice(0, 7)),
    ])).sort().reverse();

    return months.map((month) => ({ value: month, label: formatMonthLabel(month) }));
  }, [data.compras, data.vendas]);

  const dashboardData = useMemo(() => {
    const vendasPeriodo = data.vendas.filter((v) => isInRange(v.data, periodRange));
    const comprasPeriodo = data.compras.filter((c) => !c.cartaoId && isInRange(c.data, periodRange));
    const cardInstallmentsPeriodo = data.cartoes.flatMap((cartao) => (
      data.compras.flatMap((compra) => getCardPurchaseInstallments(compra, cartao).map((installment) => ({
        ...installment,
        dueDate: buildDateForMonth(installment.mes, cartao.vencimento || 10),
      })))
    )).filter((installment) => isInRange(installment.dueDate, periodRange));
    const totalVendas = vendasPeriodo.reduce((acc, v) => acc + v.valor, 0);
    const totalCompras = comprasPeriodo.reduce((acc, c) => acc + c.valor, 0);
    const faturasValor = cardInstallmentsPeriodo.reduce((acc, installment) => acc + installment.valor, 0);
    const totalSaidas = totalCompras + faturasValor;
    const produtosAtivos = data.produtos.filter((p) => p.ativo);
    const baixoEstoque = produtosAtivos.filter((p) => p.estoque <= p.estoqueMinimo);
    const valorEstoque = produtosAtivos.reduce((acc, p) => acc + p.estoque * p.custo, 0);

    return {
      stats: {
        totalVendas,
        totalCompras: totalSaidas,
        saldo: totalVendas - totalSaidas,
        faturasValor,
        produtosAtivos: produtosAtivos.length,
        baixoEstoque: baixoEstoque.length,
        valorEstoque,
      } satisfies DashboardStats,
      charts: {
        vendas7Dias: buildDailyChart(data.vendas, data.compras, data.cartoes, periodRange),
        fluxo3Meses: buildMonthlyChart(data.vendas, data.compras, data.cartoes, periodRange),
      } satisfies DashboardChartsData,
    };
  }, [data.cartoes, data.compras, data.produtos, data.vendas, periodRange]);

  const actionCenter = useMemo(() => {
    const today = formatDateInput();
    const currentMonth = formatMonthInput();
    const nextLimitDate = new Date();
    nextLimitDate.setDate(nextLimitDate.getDate() + 7);
    const nextLimit = formatDateInput(nextLimitDate);

    const boletoActions: ActionItem[] = data.compras
      .filter((compra) => compra.formaPagamento === 'boleto' && !compra.boletoPago && compra.boletoVencimento)
      .filter((compra) => compra.boletoVencimento! <= nextLimit)
      .map((compra) => ({
        id: `boleto-${compra.id}`,
        title: compra.fornecedores?.nome || 'Boleto sem fornecedor',
        description: compra.descricao || 'Boleto pendente',
        meta: `${dueDateLabel(compra.boletoVencimento!)} · ${formatCurrency(compra.valor)}`,
        status: compra.boletoVencimento! < today ? 'danger' : 'warning',
        to: '/calendario',
      }));

    const paidInvoices = new Set(data.faturaPagamentos.map((pagamento) => `${pagamento.cartaoId}:${pagamento.mes}`));
    const cardActions: ActionItem[] = data.cartoes
      .map((cartao) => {
        const dueDate = buildDateForMonth(currentMonth, cartao.vencimento || 10);
        const invoiceValue = getCardInvoiceTotal(data.compras, cartao, currentMonth);
        const isPaid = paidInvoices.has(`${cartao.id}:${currentMonth}`);
        if (invoiceValue <= 0 || isPaid || dueDate > nextLimit) return null;

        return {
          id: `cartao-${cartao.id}`,
          title: cartao.nome,
          description: 'Fatura de cartão em aberto',
          meta: `${dueDateLabel(dueDate)} · ${formatCurrency(invoiceValue)}`,
          status: dueDate < today ? 'danger' : 'warning',
          to: '/calendario',
        } satisfies ActionItem;
      })
      .filter(Boolean) as ActionItem[];

    const stockActions: ActionItem[] = data.produtos
      .filter((produto) => produto.ativo && produto.estoque <= produto.estoqueMinimo)
      .sort((a, b) => (a.estoque - a.estoqueMinimo) - (b.estoque - b.estoqueMinimo))
      .slice(0, 4)
      .map((produto) => ({
        id: `produto-${produto.id}`,
        title: produto.nome,
        description: produto.categoria || produto.sku || 'Produto abaixo do estoque mínimo',
        meta: `${produto.estoque} un. em estoque · mínimo ${produto.estoqueMinimo}`,
        status: produto.estoque === 0 ? 'danger' : 'warning',
        to: '/produtos',
      }));

    const actions = [...boletoActions, ...cardActions, ...stockActions].sort((a, b) => {
      const priority = { danger: 0, warning: 1, success: 2, neutral: 3 };
      return priority[a.status] - priority[b.status];
    });

    return actions.slice(0, 8);
  }, [data.cartoes, data.compras, data.faturaPagamentos, data.produtos]);

  const bestSellers = useMemo(() => {
    const items = new Map<string, BestSeller>();
    data.vendas
      .filter((venda) => isInRange(venda.data, periodRange))
      .forEach((venda) => {
        (venda.venda_itens || []).forEach((item) => {
          const current = items.get(item.produtoId) || {
            produtoId: item.produtoId,
            nome: item.produtos?.nome || 'Produto',
            quantidade: 0,
            receita: 0,
          };
          current.quantidade += item.quantidade;
          current.receita += item.subtotal;
          items.set(item.produtoId, current);
        });
      });

    return Array.from(items.values())
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [data.vendas, periodRange]);

  const recentActivity = useMemo(() => {
    const vendas: ActivityItem[] = data.vendas.map((venda) => ({
      id: `venda-${venda.id}`,
      type: 'venda',
      title: venda.descricao || 'Venda registrada',
      date: venda.data,
      value: venda.valor,
      to: '/vendas',
    }));
    const compras: ActivityItem[] = data.compras.map((compra) => ({
      id: `compra-${compra.id}`,
      type: 'compra',
      title: compra.fornecedores?.nome || compra.descricao || 'Compra registrada',
      date: compra.data,
      value: compra.valor,
      to: '/compras',
    }));

    return [...vendas, ...compras]
      .sort((a, b) => dateInputTime(b.date) - dateInputTime(a.date))
      .slice(0, 8);
  }, [data.compras, data.vendas]);

  const goalProgress = periodGoal > 0
    ? Math.min(100, Math.round((dashboardData.stats.totalVendas / periodGoal) * 100))
    : 0;

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
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Dashboard</h1>
          <p className="text-zinc-400">Visão geral do seu negócio e desempenho financeiro.</p>
        </div>

        <div className="filter-toolbar dashboard-filter-toolbar">
          <div className="filter-field">
            <span className="filter-label">Período</span>
            <Select
              value={periodFilter}
              onChange={(value) => setPeriodFilter(value as PeriodFilter)}
              placeholder="Período"
              options={[
                { value: 'today', label: 'Hoje' },
                { value: 'day', label: 'Dia específico' },
                { value: 'month', label: 'Mês específico' },
                { value: 'last3', label: 'Últimos 3 meses' },
                { value: 'last6', label: 'Últimos 6 meses' },
                { value: 'year', label: 'Ano atual' },
                { value: 'all', label: 'Todo histórico' },
              ]}
            />
          </div>

          {periodFilter === 'day' && (
            <div className="filter-field">
              <span className="filter-label">Dia</span>
              <DatePicker value={selectedDay} onChange={setSelectedDay} />
            </div>
          )}

          {periodFilter === 'month' && (
            <div className="filter-field">
              <span className="filter-label">Mês</span>
              <Select
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder="Mês atual"
                options={monthOptions}
              />
            </div>
          )}

          {(periodFilter !== 'month' || selectedMonth !== formatMonthInput()) && (
            <button
              type="button"
              title="Restaurar mês atual"
              onClick={() => { setPeriodFilter('month'); setSelectedMonth(formatMonthInput()); setSelectedDay(formatDateInput()); }}
              className="filter-clear-button text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
        <CalendarDays size={17} className="text-primary" />
        <span>Mostrando dados de</span>
        <strong className="text-white">{periodRange.label}</strong>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
                <Target size={19} className="text-primary" />
                Meta do período
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Acompanhe quanto das vendas filtradas já alcançou a meta definida.
              </p>
            </div>
            <div className="w-full sm:w-48">
              <input
                type="number"
                min="0"
                step="100"
                value={periodGoal || ''}
                onChange={(e) => setPeriodGoal(e.target.value ? Number(e.target.value) : 0)}
                placeholder="Meta em R$"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="money-text font-bold text-white">{formatCurrency(dashboardData.stats.totalVendas)}</span>
              <span className="text-zinc-500">
                {periodGoal > 0 ? `${goalProgress}% de ${formatCurrency(periodGoal)}` : 'Defina uma meta'}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-950 border border-zinc-800">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <span className="text-xs font-bold uppercase text-zinc-500">Atalhos rápidos</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { to: '/vendas', label: 'Vendas' },
              { to: '/compras', label: 'Compras' },
              { to: '/produtos', label: 'Estoque' },
              { to: '/calendario', label: 'Calendário' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-center text-sm font-bold text-zinc-300 transition-colors hover:border-primary/40 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="dashboard-stat-grid grid gap-4">
        <StatCard 
          title="Vendas"
          value={formatCurrency(dashboardData.stats.totalVendas)}
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-400"
          subtitle={periodRange.shortLabel}
        />
        <StatCard 
          title="Compras"
          value={formatCurrency(dashboardData.stats.totalCompras)}
          icon={ShoppingBag}
          color="bg-rose-500/10 text-rose-400"
          subtitle={periodRange.shortLabel}
        />
        <StatCard 
          title="Saldo"
          value={formatCurrency(dashboardData.stats.saldo)}
          icon={Wallet}
          color="bg-blue-500/10 text-blue-400"
          subtitle="Lucro/Prejuízo"
        />
        <StatCard 
          title="Faturas"
          value={formatCurrency(dashboardData.stats.faturasValor)}
          icon={CreditCard}
          color="bg-purple-500/10 text-purple-400"
          subtitle={periodRange.shortLabel}
        />
        <StatCard
          title="Produtos Ativos"
          value={dashboardData.stats.produtosAtivos || 0}
          icon={Boxes}
          color="bg-cyan-500/10 text-cyan-400"
          subtitle="Catálogo atual"
        />
        <StatCard
          title="Baixo Estoque"
          value={dashboardData.stats.baixoEstoque || 0}
          icon={AlertTriangle}
          color="bg-amber-500/10 text-amber-400"
          subtitle={formatCurrency(dashboardData.stats.valorEstoque || 0)}
        />
      </div>

      <Suspense fallback={<div className="h-[420px] rounded-2xl border border-zinc-800 bg-zinc-900/50" />}>
        <ChartsPanel charts={dashboardData.charts} periodLabel={periodRange.label} />
      </Suspense>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden min-w-0">
          <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white font-outfit">Centro de Ação</h2>
              <p className="text-sm text-zinc-500 mt-1">Pendências que merecem atenção agora.</p>
            </div>
            <AlertTriangle className="text-primary shrink-0" size={21} />
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {actionCenter.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-300 flex items-center gap-3">
                <CheckCircle2 size={20} className="shrink-0" />
                <div>
                  <p className="font-bold text-white">Tudo em ordem por enquanto.</p>
                  <p className="text-sm text-emerald-300/80">Sem boletos próximos, faturas urgentes ou estoque crítico.</p>
                </div>
              </div>
            ) : (
              actionCenter.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 ${actionStatusClass[item.status]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{item.title}</p>
                      <p className="text-xs mt-1 opacity-80 truncate">{item.description}</p>
                    </div>
                    <ExternalLink size={15} className="shrink-0 opacity-70" />
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide">{item.meta}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden min-w-0">
          <div className="p-5 border-b border-zinc-800 bg-zinc-800/20">
            <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
              <Trophy size={19} className="text-primary" />
              Mais vendidos
            </h2>
            <p className="text-sm text-zinc-500 mt-1">{periodRange.label}</p>
          </div>
          <div className="p-4 space-y-3">
            {bestSellers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center">
                <PackageSearch className="mx-auto mb-3 text-zinc-600" size={30} />
                <p className="text-sm text-zinc-500">Sem itens vinculados a vendas neste período.</p>
              </div>
            ) : (
              bestSellers.map((item, index) => (
                <div key={item.produtoId} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{item.nome}</p>
                    <p className="text-xs text-zinc-500">{item.quantidade} un. vendidas</p>
                  </div>
                  <span className="money-text text-sm font-bold text-emerald-300">{formatCurrency(item.receita)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden min-w-0">
        <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white font-outfit">Atividade recente</h2>
            <p className="text-sm text-zinc-500 mt-1">Últimas vendas e compras registradas.</p>
          </div>
          <Clock3 className="text-primary shrink-0" size={21} />
        </div>
        <div className="responsive-table">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/30">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                    Nenhuma movimentação registrada ainda.
                  </td>
                </tr>
              ) : (
                recentActivity.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4" data-label="Tipo">
                      <Link
                        to={item.to}
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${
                          item.type === 'venda'
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                            : 'border-rose-500/25 bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        {item.type === 'venda' ? 'Venda' : 'Compra'}
                      </Link>
                    </td>
                    <td className="px-6 py-4" data-label="Descrição">
                      <span className="text-sm font-medium text-white">{item.title}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400" data-label="Data">{formatDateBR(item.date)}</td>
                    <td className="px-6 py-4" data-label="Valor">
                      <span className={`money-text font-bold ${item.type === 'venda' ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {formatCurrency(item.value)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
