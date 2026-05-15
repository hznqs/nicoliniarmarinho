import Store from './store.js';
import Shared from './shared.js';

const Vendas = {
    async init() {
        this.populateMonths();
        await this.renderTable();
        this.bindEvents();

        // set initial date
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('venda-data');
        if (dateInput) dateInput.value = today;
    },

    populateMonths() {
        const filterMonth = document.getElementById('filter-month');
        if (filterMonth) {
            let monthOptions = '<option value="">Todos os Meses</option>';
            const date = new Date();
            for (let i = 0; i < 12; i++) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const monthName = date.toLocaleString('pt-BR', { month: 'long' });
                const value = `${year}-${month}`;
                const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
                monthOptions += `<option value="${value}">${label}</option>`;
                date.setMonth(date.getMonth() - 1);
            }
            filterMonth.innerHTML = monthOptions;
        }
    },

    bindEvents() {
        const form = document.getElementById('form-venda');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveVenda();
            });
        }

        const filterMonth = document.getElementById('filter-month');
        if (filterMonth) {
            filterMonth.addEventListener('change', () => this.renderTable());
        }
    },

    async saveVenda() {
        const valor = parseFloat(document.getElementById('venda-valor').value);
        const data = document.getElementById('venda-data').value;
        
        await Store.addVenda({ valor, data });
        Shared.closeModal('modal-venda');
        await this.renderTable();
    },

    async deleteVenda(id) {
        if (confirm('Deseja realmente excluir esta venda?')) {
            await Store.deleteVenda(id);
            await this.renderTable();
        }
    },

    async clearFilters() {
        const filterMonth = document.getElementById('filter-month');
        if (filterMonth) filterMonth.value = '';
        
        Shared.initCustomSelects();
        await this.renderTable();
    },

    async renderTable() {
        const tbody = document.querySelector('#table-vendas tbody');
        if (!tbody) return;

        let vendas = await Store.getVendas();
        const filterMonth = document.getElementById('filter-month')?.value;

        if (filterMonth) {
            vendas = vendas.filter(v => v.data.startsWith(filterMonth));
        }

        const total = vendas.reduce((acc, v) => acc + v.valor, 0);

        tbody.innerHTML = vendas.map(v => `
            <tr>
                <td>${Shared.formatDate(v.data)}</td>
                <td style="color: var(--success); font-weight: 500;">${Shared.formatCurrency(v.valor)}</td>
                <td class="text-right">
                    <button class="btn btn-danger" onclick="window.Vendas.deleteVenda('${v.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="text-muted" style="text-align: center; padding: 2rem;">Nenhuma venda encontrada.</td></tr>';
        
        // Ensure tfoot exists
        let tfoot = document.querySelector('#table-vendas tfoot');
        if (!tfoot) {
            tfoot = document.createElement('tfoot');
            document.getElementById('table-vendas').appendChild(tfoot);
        }
        tfoot.innerHTML = `
            <tr>
                <td class="text-right" style="font-weight: 600;">Total Filtrado:</td>
                <td colspan="2" style="color: var(--primary); font-weight: 700; font-size: 1.125rem;">${Shared.formatCurrency(total)}</td>
            </tr>
        `;

        lucide.createIcons();
        Shared.initCustomSelects();
    },

    async exportarVendas() {
        const vendas = await Store.getVendas();
        if (!vendas || vendas.length === 0) {
            alert('Não há vendas para exportar.');
            return;
        }

        const dataToExport = vendas.map(v => ({
            Data: Shared.formatDate(v.data),
            Valor: Shared.formatCurrency(v.valor).replace('R$', '').trim()
        }));

        Shared.exportToExcel(dataToExport, 'Historico_Vendas');
    }
};

window.Vendas = Vendas;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Vendas.init());
} else {
    Vendas.init();
}
