import Store from './store.js';
import Shared from './shared.js';

const Compras = {
    async init() {
        await this.updateSelects();
        await this.renderCompras();
        this.bindEvents();

        // Setup initial date
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('compra-data');
        if(dateInput) dateInput.value = today;
    },

    bindEvents() {
        const formCompra = document.getElementById('form-compra');
        if (formCompra) {
            formCompra.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCompra();
            });
        }

        const filterMonth = document.getElementById('filter-month');
        const filterForn = document.getElementById('filter-fornecedor');
        const filterCartao = document.getElementById('filter-cartao');

        [filterMonth, filterForn, filterCartao].forEach(el => {
            if(el) el.addEventListener('change', () => this.renderCompras());
        });
    },

    async saveCompra() {
        const fornecedorId = document.getElementById('compra-fornecedor').value;
        const cartaoId = document.getElementById('compra-cartao').value;
        const valor = parseFloat(document.getElementById('compra-valor').value);
        const data = document.getElementById('compra-data').value;

        await Store.addCompra({ fornecedorId, cartaoId, valor, data });
        Shared.closeModal('modal-compra');
        await this.renderCompras();
    },

    async deleteCompra(id) {
        if (confirm('Deseja excluir esta compra?')) {
            await Store.deleteCompra(id);
            await this.renderCompras();
        }
    },

    async clearFilters() {
        const filterMonth = document.getElementById('filter-month');
        if (filterMonth) filterMonth.value = '';
        const filterForn = document.getElementById('filter-fornecedor');
        if (filterForn) filterForn.value = '';
        const filterCartao = document.getElementById('filter-cartao');
        if (filterCartao) filterCartao.value = '';
        
        // Rebuild selects
        Shared.initCustomSelects();
        
        await this.renderCompras();
    },

    async renderCompras() {
        const tbody = document.querySelector('#table-compras tbody');
        if (!tbody) return;

        const [rawCompras, rawForns, rawCartoes] = await Promise.all([
            Store.getCompras(),
            Store.getFornecedores(),
            Store.getCartoes()
        ]);
        let compras = rawCompras;
        
        const forns = rawForns.reduce((acc, f) => ({...acc, [f.id]: f.nome}), {});
        const cartoes = rawCartoes.reduce((acc, c) => ({...acc, [c.id]: c.nome}), {});

        // Apply filters
        const filterMonth = document.getElementById('filter-month')?.value;
        const filterForn = document.getElementById('filter-fornecedor')?.value;
        const filterCartao = document.getElementById('filter-cartao')?.value;

        if (filterMonth) {
            compras = compras.filter(c => c.data.startsWith(filterMonth));
        }
        if (filterForn) {
            compras = compras.filter(c => c.fornecedorId === filterForn);
        }
        if (filterCartao) {
            compras = compras.filter(c => c.cartaoId === filterCartao);
        }

        // Calculate total
        const total = compras.reduce((acc, c) => acc + c.valor, 0);
        const totalEl = document.getElementById('total-compras-filtrado');
        if (totalEl) totalEl.textContent = Shared.formatCurrency(total);
        
        tbody.innerHTML = compras.map(c => `
            <tr>
                <td>${Shared.formatDate(c.data)}</td>
                <td>${forns[c.fornecedorId] || 'Excluído'}</td>
                <td>${cartoes[c.cartaoId] || 'Excluído'}</td>
                <td style="color: var(--danger); font-weight: 500;">${Shared.formatCurrency(c.valor)}</td>
                <td class="text-right">
                    <button class="btn btn-danger" onclick="window.Compras.deleteCompra('${c.id}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-muted" style="text-align: center; padding: 2rem;">Nenhuma compra encontrada para os filtros.</td></tr>';
        lucide.createIcons();
    },

    async exportarCompras() {
        const compras = await Store.getCompras();
        const cartoes = await Store.getCartoes();
        const fornecedores = await Store.getFornecedores();

        const filterMonth = document.getElementById('filter-month')?.value;
        const filterForn = document.getElementById('filter-fornecedor')?.value;
        const filterCartao = document.getElementById('filter-cartao')?.value;

        let filtered = compras;
        if (filterMonth) filtered = filtered.filter(c => c.data.startsWith(filterMonth));
        if (filterForn && filterForn !== 'todos') filtered = filtered.filter(c => c.fornecedorId === filterForn);
        if (filterCartao && filterCartao !== 'todos') filtered = filtered.filter(c => c.cartaoId === filterCartao);

        if (!filtered || filtered.length === 0) {
            alert('Não há compras para exportar (verifique os filtros).');
            return;
        }

        const dataToExport = filtered.map(c => {
            const f = fornecedores.find(f => f.id === c.fornecedorId) || { nome: 'Desconhecido' };
            const cart = cartoes.find(cart => cart.id === c.cartaoId) || { nome: 'Desconhecido', digitos: '' };
            return {
                Data: Shared.formatDate(c.data),
                Fornecedor: f.nome,
                Cartão: `${cart.nome} (${cart.digitos})`,
                Valor: Shared.formatCurrency(c.valor).replace('R$', '').trim()
            };
        });

        Shared.exportToExcel(dataToExport, 'Historico_Compras');
    },

    async updateSelects() {
        const [forns, cartoes] = await Promise.all([
            Store.getFornecedores(),
            Store.getCartoes()
        ]);
        
        const modalSelectForn = document.getElementById('compra-fornecedor');
        if (modalSelectForn) {
            modalSelectForn.innerHTML = '<option value="" disabled selected>Selecione um fornecedor</option>' + 
                forns.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        }

        const filterForn = document.getElementById('filter-fornecedor');
        if (filterForn) {
            filterForn.innerHTML = '<option value="">Todos os Fornecedores</option>' + 
                forns.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        }

        const modalSelectCartao = document.getElementById('compra-cartao');
        if (modalSelectCartao) {
            modalSelectCartao.innerHTML = '<option value="" disabled selected>Selecione um cartão</option>' + 
                cartoes.map(c => `<option value="${c.id}">${c.nome} (**** ${c.digitos})</option>`).join('');
        }

        const filterCartao = document.getElementById('filter-cartao');
        if (filterCartao) {
            filterCartao.innerHTML = '<option value="">Todos os Cartões</option>' + 
                cartoes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }

        // Generate Months (last 12 months)
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

        // Initialize custom selects after populating
        Shared.initCustomSelects();
    }
};

window.Compras = Compras;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Compras.init());
} else {
    Compras.init();
}
