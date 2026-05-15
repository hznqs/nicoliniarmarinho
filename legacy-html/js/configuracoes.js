import Store from './store.js';
import Shared from './shared.js';

const Configuracoes = {
    _currentLogoBase64: '',

    async init() {
        await this.loadConfig();
        this.bindEvents();
    },

    bindEvents() {
        const form = document.getElementById('form-config');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveConfig();
            });
        }

        const btnUpload = document.getElementById('btn-upload');
        const fileInput = document.getElementById('config-logo-file');
        const btnRemove = document.getElementById('btn-remove-logo');

        if (btnUpload && fileInput) {
            btnUpload.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        if (btnRemove) {
            btnRemove.addEventListener('click', () => {
                this._currentLogoBase64 = '';
                document.getElementById('logo-preview').style.display = 'none';
                btnRemove.style.display = 'none';
                fileInput.value = '';
            });
        }
    },

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Compress image using canvas
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 120;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/png');
                this._currentLogoBase64 = dataUrl;
                
                const preview = document.getElementById('logo-preview');
                preview.src = dataUrl;
                preview.style.display = 'block';
                document.getElementById('btn-remove-logo').style.display = 'flex';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async loadConfig() {
        const config = await Store.getConfig();
        const inputNome = document.getElementById('config-nome');
        
        if (inputNome) inputNome.value = config.nome || 'Armarinho';
        
        if (config.logo) {
            this._currentLogoBase64 = config.logo;
            const preview = document.getElementById('logo-preview');
            if (preview) {
                preview.src = config.logo;
                preview.style.display = 'block';
                document.getElementById('btn-remove-logo').style.display = 'flex';
            }
        }
    },

    async saveConfig() {
        const nome = document.getElementById('config-nome').value.trim();
        const logo = this._currentLogoBase64;

        await Store.saveConfig({ nome, logo });
        
        // Update UI immediately
        Shared.updateStoreBranding();
        
        // Visual feedback
        const btn = document.querySelector('#form-config button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check"></i> Salvo com sucesso!';
        btn.style.backgroundColor = 'var(--success)';
        btn.style.color = 'white';
        lucide.createIcons();
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
            btn.style.color = '';
            lucide.createIcons();
        }, 2000);
    }
};

window.Configuracoes = Configuracoes;

document.addEventListener('DOMContentLoaded', () => {
    Configuracoes.init();
});
