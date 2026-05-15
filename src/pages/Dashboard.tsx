import { lazy, Suspense, useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DataService } from '../lib/services';
import type { Venda, Compra, Produto } from '../lib/services';
import type { DashboardChartsData } from '../components/dashboard/ChartsPanel';

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

const emptyStats: DashboardStats = {
  totalVendas: 0,
  totalCompras: 0,
  saldo: 0,
  faturasValor: 0,
  produtosAtivos: 0,
  baixoEstoque: 0,
  valorEstoque: 0,
};

const emptyCharts: DashboardChartsData = {
  vendas7Dias: [],
  fluxo3Meses: [],
};

const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: StatCardProps) => (
  <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl">
    <div className="flex items-center justify-between mb-4">
      <span className="text-zinc-400 text-sm font-medium">{title}</span>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="flex flex-col">
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <div className="flex items-center gap-1.5">
        {trend && (
          <span className={`text-xs flex items-center ${trend.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend.value}
          </span>
        )}
        <span className="text-zinc-500 text-xs">{subtitle}</span>
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    vendas: Venda[],
    compras: Compra[],
    produtos: Produto[],
    stats: DashboardStats,
    charts: DashboardChartsData
  }>({
    vendas: [],
    compras: [],
    produtos: [],
    stats: emptyStats,
    charts: emptyCharts
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendas, compras, produtos] = await Promise.all([
          DataService.getVendas(),
          DataService.getCompras(),
          DataService.getProdutos().catch(() => [] as Produto[])
        ]);

        const currentMonth = new Date().toISOString().slice(0, 7);
        
        const vendasMes = vendas.filter(v => v.data.startsWith(currentMonth));
        const totalVendas = vendasMes.reduce((acc, v) => acc + v.valor, 0);
        
        const comprasMes = compras.filter(c => c.data.startsWith(currentMonth));
        const totalCompras = comprasMes.reduce((acc, c) => acc + c.valor, 0);
        
        const faturasValor = comprasMes.filter(c => c.cartaoId).reduce((acc, c) => acc + c.valor, 0);
        const saldo = totalVendas - totalCompras;
        const produtosAtivos = produtos.filter(p => p.ativo);
        const baixoEstoque = produtosAtivos.filter(p => p.estoque <= p.estoqueMinimo);
        const valorEstoque = produtosAtivos.reduce((acc, p) => acc + p.estoque * p.custo, 0);

        // Chart Data: Vendas 7 dias
        const chart7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const displayStr = `${d.getDate()}/${d.getMonth()+1}`;
          
          const totalVendasDia = vendas
            .filter(v => v.data === dateStr)
            .reduce((acc, v) => acc + v.valor, 0);

          const totalComprasDia = compras
            .filter(c => c.data === dateStr)
            .reduce((acc, c) => acc + c.valor, 0);
          
          chart7Days.push({ name: displayStr, Vendas: totalVendasDia, Compras: totalComprasDia });
        }

        // Chart Data: Fluxo 3 meses
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const chart3Months = [];
        for (let i = 2; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const monthStr = d.toISOString().slice(0, 7);
          
          const vTot = vendas.filter(v => v.data.startsWith(monthStr)).reduce((a, b) => a + b.valor, 0);
          const cTot = compras.filter(c => c.data.startsWith(monthStr)).reduce((a, b) => a + b.valor, 0);

          chart3Months.push({ 
            name: monthNames[d.getMonth()], 
            Entradas: vTot, 
            Saídas: cTot 
          });
        }

        setData({
          vendas,
          compras,
          produtos,
          stats: {
            totalVendas,
            totalCompras,
            saldo,
            faturasValor,
            produtosAtivos: produtosAtivos.length,
            baixoEstoque: baixoEstoque.length,
            valorEstoque,
          },
          charts: {
            vendas7Dias: chart7Days,
            fluxo3Meses: chart3Months
          }
        });
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
      <header>
        <h1 className="text-3xl font-bold text-white font-outfit mb-2">Dashboard</h1>
        <p className="text-zinc-400">Visão geral do seu negócio e desempenho financeiro.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Vendas (Mês)"
          value={formatCurrency(data.stats.totalVendas)}
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-400"
          subtitle="Entradas recentes"
        />
        <StatCard 
          title="Compras (Mês)"
          value={formatCurrency(data.stats.totalCompras)}
          icon={ShoppingBag}
          color="bg-rose-500/10 text-rose-400"
          subtitle="Gastos fornecedores"
        />
        <StatCard 
          title="Saldo Mensal"
          value={formatCurrency(data.stats.saldo)}
          icon={Wallet}
          color="bg-blue-500/10 text-blue-400"
          subtitle="Lucro/Prejuízo"
        />
        <StatCard 
          title="Faturas Atuais"
          value={formatCurrency(data.stats.faturasValor)}
          icon={CreditCard}
          color="bg-purple-500/10 text-purple-400"
          subtitle="Soma mês vigente"
        />
        <StatCard
          title="Produtos Ativos"
          value={data.stats.produtosAtivos || 0}
          icon={Boxes}
          color="bg-cyan-500/10 text-cyan-400"
          subtitle="Catálogo atual"
        />
        <StatCard
          title="Baixo Estoque"
          value={data.stats.baixoEstoque || 0}
          icon={AlertTriangle}
          color="bg-amber-500/10 text-amber-400"
          subtitle={formatCurrency(data.stats.valorEstoque || 0)}
        />
      </div>

      <Suspense fallback={<div className="h-[420px] rounded-2xl border border-zinc-800 bg-zinc-900/50" />}>
        <ChartsPanel charts={data.charts} />
      </Suspense>
    </div>
  );
};
