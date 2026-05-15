/* 
  DATABASE CONFIGURATION & ABSTRACTION
  Currently defaults to LocalStorage.
  To connect to Supabase, fill the credentials below and change useSupabase to true.
*/

// https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

import { ENV } from './env.js';

const DB_CONFIG = ENV;

export let supabase = null;
if (DB_CONFIG.useSupabase) {
    supabase = createClient(DB_CONFIG.supabaseUrl, DB_CONFIG.supabaseKey);
}

const Store = {
    supabase: supabase,
    
    _localData: {
        config: { nome: 'Armarinho', logo: '' },
        vendas: [],
        fornecedores: [],
        compras: [],
        cartoes: []
    },

    _cache: {
        config: null,
        vendas: null,
        fornecedores: null,
        compras: null,
        cartoes: null
    },

    invalidate(key) {
        this._cache[key] = null;
    },

    async init() {
        if (!DB_CONFIG.useSupabase) {
            const stored = localStorage.getItem('armarinho_erp_data');
            if (stored) {
                this._localData = JSON.parse(stored);
            } else {
                this._saveLocal();
            }
        }
    },

    _saveLocal() {
        localStorage.setItem('armarinho_erp_data', JSON.stringify(this._localData));
    },

    // --- VENDAS ---
    async getVendas() {
        if (DB_CONFIG.useSupabase) {
            if (this._cache.vendas) return this._cache.vendas;
            const { data } = await supabase.from('vendas').select('*').order('data', { ascending: false });
            this._cache.vendas = data || [];
            return this._cache.vendas;
        }
        return [...this._localData.vendas].sort((a, b) => new Date(b.data) - new Date(a.data));
    },
    
    async addVenda(venda) {
        venda.id = Date.now().toString();
        if (DB_CONFIG.useSupabase) {
            await supabase.from('vendas').insert([venda]);
            this.invalidate('vendas');
        } else {
            this._localData.vendas.push(venda);
            this._saveLocal();
        }
        return venda;
    },
    
    async deleteVenda(id) {
        if (DB_CONFIG.useSupabase) {
            await supabase.from('vendas').delete().eq('id', id);
            this.invalidate('vendas');
        } else {
            this._localData.vendas = this._localData.vendas.filter(v => v.id !== id);
            this._saveLocal();
        }
    },

    // --- FORNECEDORES ---
    async getFornecedores() {
        if (DB_CONFIG.useSupabase) {
            if (this._cache.fornecedores) return this._cache.fornecedores;
            const { data } = await supabase.from('fornecedores').select('*').order('nome', { ascending: true });
            this._cache.fornecedores = data || [];
            return this._cache.fornecedores;
        }
        return [...this._localData.fornecedores].sort((a, b) => a.nome.localeCompare(b.nome));
    },
    
    async addFornecedor(fornecedor) {
        fornecedor.id = Date.now().toString();
        if (DB_CONFIG.useSupabase) {
            await supabase.from('fornecedores').insert([fornecedor]);
            this.invalidate('fornecedores');
        } else {
            this._localData.fornecedores.push(fornecedor);
            this._saveLocal();
        }
        return fornecedor;
    },
    
    async deleteFornecedor(id) {
        if (DB_CONFIG.useSupabase) {
            await supabase.from('fornecedores').delete().eq('id', id);
            await supabase.from('compras').delete().eq('fornecedorId', id);
            this.invalidate('fornecedores');
            this.invalidate('compras');
        } else {
            this._localData.fornecedores = this._localData.fornecedores.filter(f => f.id !== id);
            this._localData.compras = this._localData.compras.filter(c => c.fornecedorId !== id);
            this._saveLocal();
        }
    },

    // --- CARTÕES ---
    async getCartoes() {
        if (DB_CONFIG.useSupabase) {
            if (this._cache.cartoes) return this._cache.cartoes;
            const { data } = await supabase.from('cartoes').select('*');
            this._cache.cartoes = data || [];
            return this._cache.cartoes;
        }
        return [...this._localData.cartoes];
    },
    
    async addCartao(cartao) {
        cartao.id = Date.now().toString();
        if (DB_CONFIG.useSupabase) {
            await supabase.from('cartoes').insert([cartao]);
            this.invalidate('cartoes');
        } else {
            this._localData.cartoes.push(cartao);
            this._saveLocal();
        }
        return cartao;
    },
    
    async deleteCartao(id) {
        if (DB_CONFIG.useSupabase) {
            await supabase.from('cartoes').delete().eq('id', id);
            await supabase.from('compras').delete().eq('cartaoId', id);
            this.invalidate('cartoes');
            this.invalidate('compras');
        } else {
            this._localData.cartoes = this._localData.cartoes.filter(c => c.id !== id);
            this._localData.compras = this._localData.compras.filter(c => c.cartaoId !== id);
            this._saveLocal();
        }
    },

    // --- COMPRAS ---
    async getCompras() {
        if (DB_CONFIG.useSupabase) {
            if (this._cache.compras) return this._cache.compras;
            const { data } = await supabase.from('compras').select('*').order('data', { ascending: false });
            this._cache.compras = data || [];
            return this._cache.compras;
        }
        return [...this._localData.compras].sort((a, b) => new Date(b.data) - new Date(a.data));
    },
    
    async addCompra(compra) {
        compra.id = Date.now().toString();
        if (DB_CONFIG.useSupabase) {
            await supabase.from('compras').insert([compra]);
            this.invalidate('compras');
        } else {
            this._localData.compras.push(compra);
            this._saveLocal();
        }
        return compra;
    },
    
    async deleteCompra(id) {
        if (DB_CONFIG.useSupabase) {
            await supabase.from('compras').delete().eq('id', id);
            this.invalidate('compras');
        } else {
            this._localData.compras = this._localData.compras.filter(c => c.id !== id);
            this._saveLocal();
        }
    },

    // --- CONFIGURAÇÕES ---
    async getConfig() {
        if (DB_CONFIG.useSupabase) {
            if (this._cache.config) return this._cache.config;
            // Se tiver tabela de config
            const { data } = await supabase.from('config').select('*').limit(1).single();
            this._cache.config = data || { nome: 'Armarinho', logo: '' };
            return this._cache.config;
        }
        return this._localData.config || { nome: 'Armarinho', logo: '' };
    },

    async saveConfig(config) {
        if (DB_CONFIG.useSupabase) {
            // Insert/Upsert config
            await supabase.from('config').upsert([{ id: 1, ...config }]);
            this.invalidate('config');
        } else {
            this._localData.config = config;
            this._saveLocal();
        }
    }
};

await Store.init();
export default Store;
