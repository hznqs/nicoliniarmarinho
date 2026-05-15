import Store from './store.js';
import Shared from './shared.js';

const Cartoes = {
    async init() {
        await this.renderCartoes();
        this.bindEvents();
    },

    bindEvents() {
        const formCartao = document.getElementById('form-cartao');
        if (formCartao) {
            formCartao.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCartao();
            });
        }
    },

    async saveCartao() {
        const nome = document.getElementById('cartao-nome').value;
        const digitos = document.getElementById('cartao-digitos').value;
        const limite = parseFloat(document.getElementById('cartao-limite').value);
        const vencimento = parseInt(document.getElementById('cartao-vencimento').value);
        const fechamento = parseInt(document.getElementById('cartao-fechamento').value);

        await Store.addCartao({ nome, digitos, limite, vencimento, fechamento });
        Shared.closeModal('modal-cartao');
        await this.renderCartoes();
    },

    async deleteCartao(id) {
        if (confirm('Deseja realmente excluir este cartão? O histórico das compras feitas com ele continuará registrado (como "Excluído").')) {
            await Store.deleteCartao(id);
            await this.renderCartoes();
        }
    },

    currentViewFaturaId: null,

    async viewFatura(id) {
        this.currentViewFaturaId = id;
        
        const cartoes = await Store.getCartoes();
        const cartao = cartoes.find(c => c.id === id);
        if (!cartao) return;

        document.getElementById('fatura-titulo').textContent = `Fatura: ${cartao.nome}`;
        document.getElementById('fatura-subtitulo').textContent = `Cartão final ${cartao.digitos}`;

        // Preencher select de meses (últimos 12 meses)
        const select = document.getElementById('fatura-mes');
        select.innerHTML = '<option value="todos">Todos os meses</option>';
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const val = d.toISOString().slice(0, 7);
            const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            select.innerHTML += `<option value="${val}">${label}</option>`;
        }
        select.value = new Date().toISOString().slice(0, 7); // Mês atual
        
        // Re-inicia os custom selects para aplicar o estilo premium neste select
        Shared.initCustomSelects();

        await this.renderFatura();
        Shared.openModal('modal-fatura');
        lucide.createIcons();
    },

    filterFatura() {
        this.renderFatura();
    },

    async renderFatura() {
        if (!this.currentViewFaturaId) return;
        
        const compras = await Store.getCompras();
        const mesFiltro = document.getElementById('fatura-mes').value;
        
        let comprasCartao = compras.filter(c => c.cartaoId === this.currentViewFaturaId);
        
        if (mesFiltro !== 'todos') {
            comprasCartao = comprasCartao.filter(c => c.data.startsWith(mesFiltro));
        }

        const tbody = document.getElementById('tbody-fatura');
        
        if (comprasCartao.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma compra encontrada para este período.</td></tr>`;
            document.getElementById('fatura-total').textContent = Shared.formatCurrency(0);
        } else {
            // Ordenar por data mais recente
            comprasCartao.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            let total = 0;
            tbody.innerHTML = comprasCartao.map(c => {
                total += c.valor;
                return `
                    <tr>
                        <td>${Shared.formatDate(c.data)}</td>
                        <td style="color: var(--danger); font-weight: 500;">${Shared.formatCurrency(c.valor)}</td>
                        <td><span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #d97706;">Lançado</span></td>
                    </tr>
                `;
            }).join('');
            
            document.getElementById('fatura-total').textContent = Shared.formatCurrency(total);
        }
        lucide.createIcons();
    },

    async exportarFatura() {
        if (!this.currentViewFaturaId) return;
        
        const compras = await Store.getCompras();
        const mesFiltro = document.getElementById('fatura-mes').value;
        
        let comprasCartao = compras.filter(c => c.cartaoId === this.currentViewFaturaId);
        if (mesFiltro !== 'todos') {
            comprasCartao = comprasCartao.filter(c => c.data.startsWith(mesFiltro));
        }

        if (comprasCartao.length === 0) {
            alert('Não há compras para exportar neste período.');
            return;
        }

        const dataToExport = comprasCartao.map(c => ({
            Data: Shared.formatDate(c.data),
            Descrição: c.descricao || 'Compra sem descrição',
            Valor: Shared.formatCurrency(c.valor).replace('R$', '').trim()
        }));

        Shared.exportToExcel(dataToExport, `Fatura_${mesFiltro}`);
    },

    async renderCartoes() {
        const grid = document.getElementById('grid-cartoes');
        if (!grid) return;

        const cartoes = await Store.getCartoes();
        
        if (cartoes.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">Nenhum cartão cadastrado.</div>';
            return;
        }
        
        grid.innerHTML = cartoes.map(c => `
            <div class="credit-card-item">
                <div class="cc-chip"></div>
                <div class="cc-actions">
                    <button onclick="window.Cartoes.deleteCartao('${c.id}')">
                        <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                    </button>
                </div>
                <div class="cc-header">
                    <div class="cc-name">${c.nome}</div>
                    <i data-lucide="credit-card"></i>
                </div>
                <div class="cc-number">
                    **** **** **** ${c.digitos}
                </div>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-outline" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 0.4rem; border-color: rgba(255,255,255,0.2);" onclick="window.Cartoes.viewFatura('${c.id}')">
                        <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> Ver Fatura
                    </button>
                </div>
                <div class="cc-footer">
                    <div>
                        <span>Limite</span>
                        <strong>${Shared.formatCurrency(c.limite)}</strong>
                    </div>
                    <div>
                        <span>Vencimento</span>
                        <strong>Dia ${c.vencimento}</strong>
                    </div>
                    <div>
                        <span>Fechamento</span>
                        <strong>Dia ${c.fechamento}</strong>
                    </div>
                </div>
            </div>
        `).join('');
        
        lucide.createIcons();
    }
};

window.Cartoes = Cartoes;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Cartoes.init());
} else {
    Cartoes.init();
}
