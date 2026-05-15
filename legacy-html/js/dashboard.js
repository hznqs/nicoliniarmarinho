import Store from './store.js';
import Shared from './shared.js';

const Dashboard = {
    async init() {
        // Fetch all data in parallel exactly ONCE
        const [vendas, compras, cartoes] = await Promise.all([
            Store.getVendas(),
            Store.getCompras(),
            Store.getCartoes()
        ]);
        
        this.updateStats(vendas, compras, cartoes);
        this.renderCharts(vendas, compras);
    },

    updateStats(vendas, compras, cartoes) {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        const vendasMes = vendas.filter(v => v.data.startsWith(currentMonth));
        const totalVendas = vendasMes.reduce((acc, v) => acc + v.valor, 0);
        
        const comprasMes = compras.filter(c => c.data.startsWith(currentMonth));
        const totalCompras = comprasMes.reduce((acc, c) => acc + c.valor, 0);
        
        const saldo = totalVendas - totalCompras;

        const elVendas = document.getElementById('dash-vendas-mes');
        if (elVendas) elVendas.textContent = Shared.formatCurrency(totalVendas);

        const elCompras = document.getElementById('dash-compras-mes');
        if (elCompras) elCompras.textContent = Shared.formatCurrency(totalCompras);

        const elSaldo = document.getElementById('dash-saldo');
        if (elSaldo) {
            elSaldo.textContent = Shared.formatCurrency(saldo);
            elSaldo.style.color = saldo >= 0 ? 'var(--success)' : 'var(--danger)';
        }

        const elFaturas = document.getElementById('dash-faturas');
        if (elFaturas) {
            const faturasValor = comprasMes.filter(c => c.cartaoId).reduce((acc, c) => acc + c.valor, 0);
            elFaturas.textContent = Shared.formatCurrency(faturasValor);
        }
    },

    renderCharts(vendas, compras) {
        // 1. Vendas dos últimos 7 dias
        const labels7Days = [];
        const vendas7Days = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const displayStr = `${d.getDate()}/${d.getMonth()+1}`;
            
            labels7Days.push(displayStr);
            const totalDia = vendas
                .filter(v => v.data === dateStr)
                .reduce((acc, v) => acc + v.valor, 0);
            vendas7Days.push(totalDia);
        }

        const ctxLine = document.getElementById('chart-vendas-dia')?.getContext('2d');
        if (ctxLine) {
            // Create gradient
            const gradient = ctxLine.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
            gradient.addColorStop(1, 'rgba(251, 191, 36, 0.0)');

            new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: labels7Days,
                    datasets: [{
                        label: 'Vendas (R$)',
                        data: vendas7Days,
                        borderColor: '#fbbf24',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        pointBackgroundColor: '#18181b',
                        pointBorderColor: '#fbbf24',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#27272a',
                            titleColor: '#e4e4e7',
                            bodyColor: '#fbbf24',
                            padding: 12,
                            borderColor: '#3f3f46',
                            borderWidth: 1,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    return Shared.formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                            ticks: { color: '#a1a1aa', callback: (val) => 'R$ ' + val }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#a1a1aa' }
                        }
                    }
                }
            });
        }

        // 2. Fluxo: Vendas vs Compras nos últimos 3 meses
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const labels3Months = [];
        const vendas3Months = [];
        const compras3Months = [];

        for (let i = 2; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStr = d.toISOString().slice(0, 7);
            labels3Months.push(monthNames[d.getMonth()]);

            const vTot = vendas.filter(v => v.data.startsWith(monthStr)).reduce((a, b) => a + b.valor, 0);
            const cTot = compras.filter(c => c.data.startsWith(monthStr)).reduce((a, b) => a + b.valor, 0);

            vendas3Months.push(vTot);
            compras3Months.push(cTot);
        }

        const ctxBar = document.getElementById('chart-fluxo')?.getContext('2d');
        if (ctxBar) {
            new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: labels3Months,
                    datasets: [
                        {
                            label: 'Entradas',
                            data: vendas3Months,
                            backgroundColor: '#10b981',
                            borderRadius: 6,
                            barPercentage: 0.6,
                            categoryPercentage: 0.8
                        },
                        {
                            label: 'Saídas',
                            data: compras3Months,
                            backgroundColor: '#ef4444',
                            borderRadius: 6,
                            barPercentage: 0.6,
                            categoryPercentage: 0.8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            align: 'end',
                            labels: { color: '#a1a1aa', usePointStyle: true, boxWidth: 8 }
                        },
                        tooltip: {
                            backgroundColor: '#27272a',
                            titleColor: '#e4e4e7',
                            padding: 12,
                            borderColor: '#3f3f46',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + Shared.formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                            ticks: { color: '#a1a1aa', callback: (val) => 'R$ ' + val }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#a1a1aa' }
                        }
                    }
                }
            });
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Dashboard.init());
} else {
    Dashboard.init();
}
