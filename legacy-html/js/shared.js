// Shared functions and layout logic
import Store from './store.js';
import Auth from './auth.js';

const Shared = {
    async init() {
        // Auth Guard
        if (!window.location.pathname.includes('login.html')) {
            const isAuth = await Auth.checkSession();
            if (!isAuth) {
                window.location.href = 'login.html';
                return;
            }
        }

        lucide.createIcons();
        this.bindEvents();
        this.highlightCurrentNav();
        this.updateStoreBranding();
    },

    async updateStoreBranding() {
        const config = await Store.getConfig();
        const nomeEl = document.getElementById('store-name-sidebar');
        const logoEl = document.getElementById('store-logo-sidebar');
        const iconEl = document.getElementById('store-icon-sidebar');

        if (nomeEl) nomeEl.textContent = config.nome || 'Armarinho';

        if (logoEl && iconEl) {
            if (config.logo && config.logo.trim() !== '') {
                logoEl.src = config.logo;
                logoEl.style.display = 'block';
                iconEl.style.display = 'none';
            } else {
                logoEl.style.display = 'none';
                iconEl.style.display = 'block';
            }
        }

        // Logout Button
        const logoutBtn = document.createElement('a');
        logoutBtn.href = "#";
        logoutBtn.className = "nav-item";
        logoutBtn.style.marginTop = "auto";
        logoutBtn.style.color = "var(--danger)";
        logoutBtn.innerHTML = `<i data-lucide="log-out"></i><span>Sair</span>`;
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await Auth.logout();
        });
        
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav) {
            sidebarNav.appendChild(logoutBtn);
            lucide.createIcons();
        }
    },

    bindEvents() {
        // Mobile Sidebar Toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (menuToggle && sidebar && overlay) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.add('open');
                overlay.classList.add('active');
            });

            const closeSidebar = () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            };

            if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
            overlay.addEventListener('click', closeSidebar);
        }

        // Smooth Page Transitions
        document.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href !== '#' && !href.startsWith('http') && !link.hasAttribute('target')) {
                    e.preventDefault();
                    document.body.classList.add('page-exit');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 150);
                }
            });
        });
    },

    highlightCurrentNav() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
            if (nav.getAttribute('href') === page) {
                nav.classList.add('active');
            }
        });
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            const form = modal.querySelector('form');
            if (form) form.reset();
            
            // reset dates to today if present
            const today = new Date().toISOString().split('T')[0];
            const dateInputs = modal.querySelectorAll('input[type="date"]');
            dateInputs.forEach(input => input.value = today);
        }
    },

    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Store._data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "armarinho_backup_" + new Date().getTime() + ".json");
        document.body.appendChild(downloadAnchorNode); 
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    exportToExcel(data, filename) {
        if (!data || !data.length) return;
        
        // Obter cabeçalhos das chaves do primeiro objeto
        const headers = Object.keys(data[0]);
        
        // BOM para UTF-8 (Excel aceita perfeitamente)
        let csvContent = "\uFEFF";
        
        // Cabeçalhos (primeira letra maiúscula)
        csvContent += headers.map(h => h.charAt(0).toUpperCase() + h.slice(1)).join(";") + "\r\n";
        
        // Linhas de dados
        data.forEach(row => {
            let rowData = headers.map(header => {
                let cellData = row[header];
                if (cellData === null || cellData === undefined) cellData = "";
                
                // Formatar texto para não bugar no Excel (se houver aspas ou ponto e vírgula)
                let text = cellData.toString();
                if (text.includes(";") || text.includes("\"") || text.includes("\n")) {
                    text = `"${text.replace(/"/g, '""')}"`;
                }
                return text;
            });
            csvContent += rowData.join(";") + "\r\n";
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", filename + "_" + new Date().toISOString().slice(0,10) + ".csv");
        document.body.appendChild(downloadAnchorNode); 
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);
    },

    initCustomSelects() {
        document.querySelectorAll('select.custom-select').forEach(select => {
            if (!select.dataset.customized) {
                new CustomSelect(select);
            } else if (select.customSelectInstance) {
                select.customSelectInstance.rebuild();
            }
        });
    }
};

class CustomSelect {
    constructor(originalSelect) {
        this.originalSelect = originalSelect;
        this.originalSelect.dataset.customized = "true";
        this.originalSelect.customSelectInstance = this;
        this.originalSelect.style.display = 'none';

        this.wrapper = document.createElement('div');
        this.wrapper.className = `custom-select-wrapper ${this.originalSelect.className}`;
        this.wrapper.classList.remove('custom-select');

        this.trigger = document.createElement('div');
        this.trigger.className = 'custom-select-trigger';
        
        this.triggerSpan = document.createElement('span');
        
        const iconSvg = document.createElement('div');
        iconSvg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
        
        this.trigger.appendChild(this.triggerSpan);
        this.trigger.appendChild(iconSvg.firstChild);

        this.optionsList = document.createElement('div');
        this.optionsList.className = 'custom-select-options';

        this.wrapper.appendChild(this.trigger);
        this.wrapper.appendChild(this.optionsList);
        this.originalSelect.parentNode.insertBefore(this.wrapper, this.originalSelect.nextSibling);

        this.bindEvents();
        this.rebuild();
    }

    rebuild() {
        this.optionsList.innerHTML = '';
        const options = Array.from(this.originalSelect.options);
        
        options.forEach(option => {
            const div = document.createElement('div');
            div.className = 'custom-option';
            if (option.selected) div.classList.add('selected');
            div.textContent = option.textContent;
            div.dataset.value = option.value;
            
            div.addEventListener('click', () => {
                this.originalSelect.value = option.value;
                this.updateTrigger();
                this.wrapper.classList.remove('open');
                
                // Remove selected from others
                Array.from(this.optionsList.children).forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
                
                // Dispatch change event to original select
                this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            this.optionsList.appendChild(div);
        });

        this.updateTrigger();
    }

    updateTrigger() {
        const selectedOption = this.originalSelect.options[this.originalSelect.selectedIndex];
        if (selectedOption) {
            this.triggerSpan.textContent = selectedOption.textContent;
        } else {
            this.triggerSpan.textContent = "Selecione...";
        }
    }

    bindEvents() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // close others
            document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                if (w !== this.wrapper) w.classList.remove('open');
            });
            this.wrapper.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.wrapper.classList.remove('open');
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Shared.init());
} else {
    Shared.init();
}

window.Shared = Shared;
export default Shared;
