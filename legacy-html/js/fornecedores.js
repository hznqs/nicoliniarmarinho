import Store from './store.js';
import Shared from './shared.js';

const Fornecedores = {
    async init() {
        await this.renderFornecedores();
        this.bindEvents();
    },

    bindEvents() {
        const formForn = document.getElementById('form-fornecedor');
        if (formForn) {
            formForn.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveFornecedor();
            });
        }
    },

    async saveFornecedor() {
        const nome = document.getElementById('forn-nome').value;
        const descricao = document.getElementById('forn-descricao').value || '';
        
        await Store.addFornecedor({ nome, descricao });
        
        document.getElementById('forn-nome').value = '';
        document.getElementById('forn-descricao').value = '';
        Shared.closeModal('modal-fornecedor');
        await this.renderFornecedores();
    },

    async deleteFornecedor(id) {
        if (confirm('Deseja realmente excluir este fornecedor? Ele será removido (como "Excluído") das suas compras.')) {
            await Store.deleteFornecedor(id);
            await this.renderFornecedores();
        }
    },

    async renderFornecedores() {
        const tbody = document.querySelector('#table-fornecedores tbody');
        if (!tbody) return;

        const forns = await Store.getFornecedores();
        
        tbody.innerHTML = forns.map(f => `
            <tr>
                <td style="font-weight: 500;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="avatar" style="background: rgba(245, 158, 11, 0.1); color: var(--primary); width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                            ${f.nome.charAt(0).toUpperCase()}
                        </div>
                        ${f.nome}
                    </div>
                </td>
                <td style="color: var(--text-muted); max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${f.descricao || '-'}
                </td>
                <td class="text-right">
                    <button class="btn btn-outline" onclick="window.Fornecedores.deleteFornecedor('${f.id}')" style="padding: 0.35rem 0.5rem; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="text-muted" style="text-align: center; padding: 2rem;">Nenhum fornecedor cadastrado.</td></tr>';
        
        lucide.createIcons();
    },

    async exportarFornecedores() {
        const forns = await Store.getFornecedores();
        if (!forns || forns.length === 0) {
            alert('Não há fornecedores para exportar.');
            return;
        }

        const dataToExport = forns.map(f => ({
            Nome: f.nome,
            'Descrição/Observação': f.descricao || '-'
        }));

        Shared.exportToExcel(dataToExport, 'Lista_Fornecedores');
    }
};

window.Fornecedores = Fornecedores;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Fornecedores.init());
} else {
    Fornecedores.init();
}
