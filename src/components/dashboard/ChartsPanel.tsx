import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface DashboardChartsData {
  vendas7Dias: Array<{ name: string; Vendas: number; Compras: number }>;
  fluxo3Meses: Array<{ name: string; Entradas: number; Saídas: number }>;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatCompactCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

const ChartCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-5 md:p-6 rounded-2xl h-[340px] sm:h-[420px] flex flex-col overflow-hidden">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
      </div>
      <div className="text-xs text-zinc-500 border border-zinc-800 rounded-full px-3 py-1 bg-zinc-950/50">
        Tempo real
      </div>
    </div>
    <div className="flex-1 min-h-0">
      {children}
    </div>
  </div>
);

export const ChartsPanel = ({ charts }: { charts: DashboardChartsData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <ChartCard title="Movimento Diário" subtitle="Entradas e compras nos últimos 7 dias">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={charts.vendas7Dias} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCompras" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.24}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-chart-grid, #27272a)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--app-text-muted, #71717a)" fontSize={12} tickLine={false} axisLine={false} dy={8} />
            <YAxis stroke="var(--app-text-muted, #71717a)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatCompactCurrency(Number(val))} width={64} />
            <Tooltip
              cursor={{ stroke: 'rgba(var(--app-primary-rgb),0.35)', strokeWidth: 1 }}
              contentStyle={{ backgroundColor: 'var(--app-bg-surface, #18181b)', borderColor: 'var(--app-border-light, #3f3f46)', borderRadius: '14px', color: '#fff', boxShadow: '0 18px 45px rgba(0,0,0,0.35)' }}
              labelStyle={{ color: 'var(--app-text-primary, #fff)', fontWeight: 700, marginBottom: 6 }}
              formatter={(value, name) => [formatCurrency(Number(value)), name]}
            />
            <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 18, color: 'var(--app-text-muted)' }} />
            <Area type="monotone" dataKey="Vendas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" activeDot={{ r: 6, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Compras" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompras)" activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Receitas vs Despesas" subtitle="Comparativo financeiro dos últimos 3 meses">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.fluxo3Meses} margin={{ top: 16, right: 12, left: 0, bottom: 4 }} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-chart-grid, #27272a)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--app-text-muted, #71717a)" fontSize={12} tickLine={false} axisLine={false} dy={8} />
            <YAxis stroke="var(--app-text-muted, #71717a)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatCompactCurrency(Number(val))} width={64} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.035)' }}
              contentStyle={{ backgroundColor: 'var(--app-bg-surface, #18181b)', borderColor: 'var(--app-border-light, #3f3f46)', borderRadius: '14px', color: '#fff', boxShadow: '0 18px 45px rgba(0,0,0,0.35)' }}
              labelStyle={{ color: 'var(--app-text-primary, #fff)', fontWeight: 700, marginBottom: 6 }}
              formatter={(value, name) => [formatCurrency(Number(value)), name]}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', color: 'var(--app-text-muted)' }} />
            <Bar dataKey="Entradas" fill="#10b981" radius={[8, 8, 4, 4]} barSize={24} />
            <Bar dataKey="Saídas" fill="#f43f5e" radius={[8, 8, 4, 4]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
