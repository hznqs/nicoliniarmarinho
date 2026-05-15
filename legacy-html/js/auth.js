import Store from './store.js';
import { ENV } from './env.js';

const Auth = {
    isLoginMode: true,

    async init() {
        if (!ENV.useSupabase) {
            // LocalStorage bypass for Auth (dev environment)
            window.location.href = 'index.html';
            return;
        } else {
            // Se já estiver logado, entra direto!
            const isAuth = await this.checkSession();
            if (isAuth) {
                window.location.href = 'index.html';
                return;
            }
        }

        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmit();
            });
        }

        const toggleBtn = document.getElementById('toggle-auth');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMode();
            });
        }
    },

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const btnText = document.getElementById('btn-auth-text');
        const groupName = document.getElementById('group-name');
        const nameInput = document.getElementById('name');
        const toggleText = document.getElementById('toggle-text');
        const toggleBtn = document.getElementById('toggle-auth');
        const errorMsg = document.getElementById('error-msg');

        errorMsg.classList.remove('visible');

        if (this.isLoginMode) {
            title.textContent = 'Acesso Restrito';
            subtitle.textContent = 'Faça login para gerenciar o Armarinho';
            btnText.textContent = 'Entrar no Sistema';
            groupName.style.display = 'none';
            nameInput.removeAttribute('required');
            toggleText.textContent = 'Ainda não tem acesso?';
            toggleBtn.textContent = 'Criar Conta';
        } else {
            title.textContent = 'Criar Conta';
            subtitle.textContent = 'Registre-se para iniciar a gestão';
            btnText.textContent = 'Finalizar Cadastro';
            groupName.style.display = 'block';
            nameInput.setAttribute('required', 'true');
            toggleText.textContent = 'Já possui uma conta?';
            toggleBtn.textContent = 'Fazer Login';
        }
    },

    async handleSubmit() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('btn-auth');
        const btnText = document.getElementById('btn-auth-text');
        const errorMsg = document.getElementById('error-msg');

        // Loading state
        const originalText = btnText.textContent;
        btn.innerHTML = '<span>Processando...</span>';
        btn.disabled = true;
        errorMsg.classList.remove('visible');

        try {
            if (this.isLoginMode) {
                const { data, error } = await Store.supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            } else {
                const name = document.getElementById('name').value;
                const { data, error } = await Store.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name }
                    }
                });
                
                if (error) throw error;
                
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    throw new Error("Este e-mail já está em uso.");
                }
            }

            // Success
            btn.innerHTML = '<span>Acesso Permitido</span> <i data-lucide="check-circle"></i>';
            lucide.createIcons();
            btn.style.background = 'var(--success)';
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 150);

        } catch (error) {
            console.error('Auth error:', error.message);
            errorMsg.textContent = error.message === "Invalid login credentials" 
                ? "Credenciais inválidas. Tente novamente." 
                : error.message;
            errorMsg.classList.add('visible');
            btn.innerHTML = `<span id="btn-auth-text">${originalText}</span> <i data-lucide="arrow-right"></i>`;
            lucide.createIcons();
            btn.disabled = false;
        }
    },

    async checkSession() {
        if (!ENV.useSupabase) return true; // By-pass if local
        
        const { data: { session } } = await Store.supabase.auth.getSession();
        return !!session;
    },

    async logout() {
        if (ENV.useSupabase) {
            await Store.supabase.auth.signOut();
        }
        window.location.href = 'login.html';
    }
};

window.Auth = Auth;

// Initialize if we are on the login page
if (window.location.pathname.includes('login.html')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Auth.init());
    } else {
        Auth.init();
    }
}

export default Auth;
