import { supabase } from './supabase';
import {
  assertInteger,
  assertMoney,
  assertRequiredText,
  clampText,
  normalizeOptionalText,
} from './validation';

export interface Venda {
  id: string;
  data: string;
  valor: number;
  descricao?: string;
  venda_itens?: VendaItem[];
}

export interface VendaItem {
  id: string;
  vendaId: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  produtos?: { nome: string; sku?: string };
}

export interface VendaItemInput {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
}

export interface Compra {
  id: string;
  data: string;
  valor: number;
  descricao?: string;
  fornecedorId: string;
  cartaoId?: string | null;
  fornecedores?: { nome: string };
  cartoes?: { nome: string };
}

export interface Cartao {
  id: string;
  nome: string;
  limite?: number;
  digitos?: string;
  fechamento?: number;
  vencimento?: number;
}

export interface Fornecedor {
  id: string;
  nome: string;
  categoria?: string;
  descricao?: string;
}

export interface Produto {
  id: string;
  nome: string;
  sku?: string;
  categoria?: string;
  estoque: number;
  estoqueMinimo: number;
  custo: number;
  precoVenda: number;
  ativo: boolean;
}

export interface Config {
  user_id?: string;
  nome: string;
  logo: string;
}

const getCurrentUserId = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user?.id) throw new Error('Usuário não autenticado no sistema.');
  return session.user.id;
};

const sanitizeVenda = (venda: Omit<Venda, 'id'> | Partial<Venda>) => {
  const { venda_itens: _vendaItens, ...rest } = venda;
  void _vendaItens;

  return {
    ...rest,
    valor: venda.valor === undefined ? undefined : assertMoney(venda.valor, 'Valor da venda'),
    data: venda.data,
    descricao: normalizeOptionalText(venda.descricao, 220),
  };
};

const sanitizeCompra = (compra: Partial<Compra>) => ({
  ...compra,
  valor: compra.valor === undefined ? undefined : assertMoney(compra.valor, 'Valor da compra'),
  data: compra.data,
  descricao: normalizeOptionalText(compra.descricao, 260),
  fornecedorId: compra.fornecedorId ? clampText(compra.fornecedorId, 80) : compra.fornecedorId,
  cartaoId: compra.cartaoId ? clampText(compra.cartaoId, 80) : null,
});

const sanitizeCartao = (cartao: Omit<Cartao, 'id'> | Partial<Cartao>) => ({
  ...cartao,
  nome: cartao.nome === undefined ? undefined : assertRequiredText(cartao.nome, 'Nome do cartão', 80),
  limite: cartao.limite === undefined ? undefined : assertMoney(cartao.limite, 'Limite'),
  digitos: cartao.digitos ? clampText(cartao.digitos.replace(/\D/g, ''), 4) : undefined,
  fechamento: cartao.fechamento === undefined ? undefined : assertInteger(cartao.fechamento, 'Fechamento', 1),
  vencimento: cartao.vencimento === undefined ? undefined : assertInteger(cartao.vencimento, 'Vencimento', 1),
});

const sanitizeFornecedor = (fornecedor: Omit<Fornecedor, 'id'> | Partial<Fornecedor>) => ({
  ...fornecedor,
  nome: fornecedor.nome === undefined ? undefined : assertRequiredText(fornecedor.nome, 'Nome do fornecedor', 120),
  categoria: normalizeOptionalText(fornecedor.categoria, 80),
  descricao: normalizeOptionalText(fornecedor.descricao, 500),
});

const sanitizeProduto = (produto: Omit<Produto, 'id'> | Partial<Produto>) => ({
  ...produto,
  nome: produto.nome === undefined ? undefined : assertRequiredText(produto.nome, 'Nome do produto', 120),
  sku: normalizeOptionalText(produto.sku, 50),
  categoria: normalizeOptionalText(produto.categoria, 80),
  estoque: produto.estoque === undefined ? undefined : assertInteger(produto.estoque, 'Estoque'),
  estoqueMinimo: produto.estoqueMinimo === undefined ? undefined : assertInteger(produto.estoqueMinimo, 'Estoque mínimo'),
  custo: produto.custo === undefined ? undefined : assertMoney(produto.custo, 'Custo'),
  precoVenda: produto.precoVenda === undefined ? undefined : assertMoney(produto.precoVenda, 'Preço de venda'),
  ativo: produto.ativo,
});

const sanitizeVendaItems = (items: VendaItemInput[]) => {
  return items
    .filter((item) => item.produtoId)
    .map((item) => {
      const quantidade = assertInteger(item.quantidade, 'Quantidade', 1);
      const precoUnitario = assertMoney(item.precoUnitario, 'Preço unitário');
      return {
        produtoId: clampText(item.produtoId, 80),
        quantidade,
        precoUnitario,
        subtotal: assertMoney(quantidade * precoUnitario, 'Subtotal'),
      };
    });
};

const totalFromItems = (items: ReturnType<typeof sanitizeVendaItems>) => {
  return assertMoney(items.reduce((acc, item) => acc + item.subtotal, 0), 'Total da venda');
};

export const DataService = {
  // Vendas
  async getVendas() {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('vendas')
      .select('*')
      .eq('user_id', user_id)
      .order('data', { ascending: false });
    if (error) throw error;

    const vendas = data as Venda[];
    if (!vendas.length) return vendas;

    const vendaIds = vendas.map((venda) => venda.id);
    const { data: items, error: itemsError } = await supabase
      .from('venda_itens')
      .select('*')
      .eq('user_id', user_id)
      .in('vendaId', vendaIds);

    if (itemsError) {
      console.warn('Itens de venda indisponíveis. Verifique se a tabela venda_itens foi criada no Supabase.', itemsError);
      return vendas;
    }

    const vendaItems = items as VendaItem[];
    const produtoIds = Array.from(new Set(vendaItems.map((item) => item.produtoId)));
    const produtosById = new Map<string, Produto>();

    if (produtoIds.length) {
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id,nome,sku')
        .eq('user_id', user_id)
        .in('id', produtoIds);

      if (!produtosError) {
        (produtosData as Produto[]).forEach((produto) => produtosById.set(produto.id, produto));
      }
    }

    const itemsByVenda = new Map<string, VendaItem[]>();
    vendaItems.forEach((item) => {
      const current = itemsByVenda.get(item.vendaId) || [];
      const produto = produtosById.get(item.produtoId);
      current.push({
        ...item,
        produtos: produto ? { nome: produto.nome, sku: produto.sku } : undefined,
      });
      itemsByVenda.set(item.vendaId, current);
    });

    return vendas.map((venda) => ({
      ...venda,
      venda_itens: itemsByVenda.get(venda.id) || [],
    }));
  },

  async createVenda(venda: Omit<Venda, 'id'>, items: VendaItemInput[] = []) {
    const user_id = await getCurrentUserId();
    const id = crypto.randomUUID();
    const cleanItems = sanitizeVendaItems(items);
    const payload = sanitizeVenda({
      ...venda,
      valor: cleanItems.length ? totalFromItems(cleanItems) : venda.valor,
    });

    if (cleanItems.length) {
      await this.ensureStockForItems(cleanItems);
    }

    const { data, error } = await supabase
      .from('vendas')
      .insert([{ id, user_id, ...payload }])
      .select();
    if (error) throw error;

    try {
      if (cleanItems.length) {
        await this.replaceVendaItems(id, cleanItems);
        await this.applyStockDelta(cleanItems.map((item) => ({
          produtoId: item.produtoId,
          delta: -item.quantidade,
        })));
      }
    } catch (itemError) {
      await supabase
        .from('vendas')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id);
      throw itemError;
    }

    return data[0] as Venda;
  },

  async updateVenda(id: string, venda: Partial<Venda>, items?: VendaItemInput[]) {
    const user_id = await getCurrentUserId();
    const cleanItems = items ? sanitizeVendaItems(items) : undefined;
    const payload = sanitizeVenda({
      ...venda,
      valor: cleanItems?.length ? totalFromItems(cleanItems) : venda.valor,
    });

    if (cleanItems) {
      const previousItems = await this.getVendaItems(id);
      const deltas = this.getStockDeltas(previousItems, cleanItems);
      await this.ensureStockForDeltas(deltas);
    }

    const { data, error } = await supabase
      .from('vendas')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user_id)
      .select();
    if (error) throw error;

    if (cleanItems) {
      const previousItems = await this.getVendaItems(id);
      const deltas = this.getStockDeltas(previousItems, cleanItems);
      await this.replaceVendaItems(id, cleanItems);
      await this.applyStockDelta(deltas);
    }

    return data[0] as Venda;
  },

  async deleteVenda(id: string) {
    const user_id = await getCurrentUserId();
    const previousItems = await this.getVendaItems(id, { tolerateMissingTable: true });
    const { error } = await supabase
      .from('vendas')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    if (error) throw error;
    if (previousItems.length) {
      await this.applyStockDelta(previousItems.map((item) => ({
        produtoId: item.produtoId,
        delta: item.quantidade,
      })));
    }
  },

  async getVendaItems(vendaId: string, options: { tolerateMissingTable?: boolean } = {}) {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('venda_itens')
      .select('*')
      .eq('user_id', user_id)
      .eq('vendaId', vendaId);
    if (error) {
      if (options.tolerateMissingTable && (
        error.message?.includes('venda_itens') ||
        error.details?.includes('venda_itens') ||
        error.code === 'PGRST205'
      )) {
        console.warn('Itens de venda indisponíveis ao excluir venda.', error);
        return [];
      }
      throw error;
    }
    return data as VendaItem[];
  },

  async replaceVendaItems(vendaId: string, items: ReturnType<typeof sanitizeVendaItems>) {
    const user_id = await getCurrentUserId();
    const { error: deleteError } = await supabase
      .from('venda_itens')
      .delete()
      .eq('user_id', user_id)
      .eq('vendaId', vendaId);
    if (deleteError) throw deleteError;

    if (!items.length) return;

    const { error } = await supabase
      .from('venda_itens')
      .insert(items.map((item) => ({
        id: crypto.randomUUID(),
        user_id,
        vendaId,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: item.subtotal,
      })));
    if (error) throw error;
  },

  getStockDeltas(previousItems: Pick<VendaItem, 'produtoId' | 'quantidade'>[], nextItems: ReturnType<typeof sanitizeVendaItems>) {
    const quantities = new Map<string, number>();
    previousItems.forEach((item) => {
      quantities.set(item.produtoId, (quantities.get(item.produtoId) ?? 0) + item.quantidade);
    });
    nextItems.forEach((item) => {
      quantities.set(item.produtoId, (quantities.get(item.produtoId) ?? 0) - item.quantidade);
    });
    return Array.from(quantities.entries())
      .map(([produtoId, delta]) => ({ produtoId, delta }))
      .filter((item) => item.delta !== 0);
  },

  async ensureStockForItems(items: ReturnType<typeof sanitizeVendaItems>) {
    await this.ensureStockForDeltas(items.map((item) => ({ produtoId: item.produtoId, delta: -item.quantidade })));
  },

  async ensureStockForDeltas(deltas: Array<{ produtoId: string; delta: number }>) {
    const decreases = deltas.filter((item) => item.delta < 0);
    if (!decreases.length) return;

    const produtos = await this.getProdutos();
    const productMap = new Map(produtos.map((produto) => [produto.id, produto]));

    decreases.forEach((item) => {
      const produto = productMap.get(item.produtoId);
      if (!produto) throw new Error('Produto não encontrado para esta venda.');
      if (produto.estoque + item.delta < 0) {
        throw new Error(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque}.`);
      }
    });
  },

  async applyStockDelta(deltas: Array<{ produtoId: string; delta: number }>) {
    if (!deltas.length) return;
    const produtos = await this.getProdutos();
    const productMap = new Map(produtos.map((produto) => [produto.id, produto]));

    await Promise.all(deltas.map((item) => {
      const produto = productMap.get(item.produtoId);
      if (!produto) throw new Error('Produto não encontrado para atualizar estoque.');
      return this.updateProduto(item.produtoId, {
        estoque: Math.max(produto.estoque + item.delta, 0),
      });
    }));
  },

  // Compras
  async getCompras() {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('compras')
      .select(`
        *,
        fornecedores (nome),
        cartoes (nome)
      `)
      .eq('user_id', user_id)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as Compra[];
  },

  async createCompra(compra: Omit<Compra, 'id' | 'fornecedores' | 'cartoes'>) {
    const user_id = await getCurrentUserId();
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('compras')
      .insert([{ id, user_id, ...sanitizeCompra(compra) }])
      .select();
    if (error) throw error;
    return data[0] as Compra;
  },

  async updateCompra(id: string, compra: Partial<Compra>) {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('compras')
      .update(sanitizeCompra(compra))
      .eq('id', id)
      .eq('user_id', user_id)
      .select();
    if (error) throw error;
    return data[0] as Compra;
  },

  async deleteCompra(id: string) {
    const user_id = await getCurrentUserId();
    const { error } = await supabase
      .from('compras')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    if (error) throw error;
  },

  // Cartões
  async getCartoes() {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('cartoes')
      .select('*')
      .eq('user_id', user_id)
      .order('nome', { ascending: true });
    if (error) throw error;
    return data as Cartao[];
  },

  async createCartao(cartao: Omit<Cartao, 'id'>) {
    const user_id = await getCurrentUserId();
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('cartoes')
      .insert([{ id, user_id, ...sanitizeCartao(cartao) }])
      .select();
    if (error) throw error;
    return data[0] as Cartao;
  },

  async updateCartao(id: string, cartao: Partial<Cartao>) {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('cartoes')
      .update(sanitizeCartao(cartao))
      .eq('id', id)
      .eq('user_id', user_id)
      .select();
    if (error) throw error;
    return data[0] as Cartao;
  },

  async deleteCartao(id: string) {
    const user_id = await getCurrentUserId();
    const { error } = await supabase
      .from('cartoes')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    if (error) throw error;
  },

  // Fornecedores
  async getFornecedores() {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('user_id', user_id)
      .order('nome', { ascending: true });
    if (error) throw error;
    return data as Fornecedor[];
  },

  async createFornecedor(fornecedor: Omit<Fornecedor, 'id'>) {
    const user_id = await getCurrentUserId();
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('fornecedores')
      .insert([{ id, user_id, ...sanitizeFornecedor(fornecedor) }])
      .select();
    if (error) throw error;
    return data[0] as Fornecedor;
  },

  async updateFornecedor(id: string, fornecedor: Partial<Fornecedor>) {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('fornecedores')
      .update(sanitizeFornecedor(fornecedor))
      .eq('id', id)
      .eq('user_id', user_id)
      .select();
    if (error) throw error;
    return data[0] as Fornecedor;
  },

  async deleteFornecedor(id: string) {
    const user_id = await getCurrentUserId();
    const { error } = await supabase
      .from('fornecedores')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    if (error) throw error;
  },

  // Produtos / Estoque
  async getProdutos() {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('user_id', user_id)
      .order('nome', { ascending: true });
    if (error) throw error;
    return data as Produto[];
  },

  async createProduto(produto: Omit<Produto, 'id'>) {
    const user_id = await getCurrentUserId();
    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('produtos')
      .insert([{ id, user_id, ...sanitizeProduto(produto) }])
      .select();
    if (error) throw error;
    return data[0] as Produto;
  },

  async updateProduto(id: string, produto: Partial<Produto>) {
    const user_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('produtos')
      .update(sanitizeProduto(produto))
      .eq('id', id)
      .eq('user_id', user_id)
      .select();
    if (error) throw error;
    return data[0] as Produto;
  },

  async deleteProduto(id: string) {
    const user_id = await getCurrentUserId();
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    if (error) throw error;
  },

  // Configurações
  async getConfig() {
    try {
      const user_id = await getCurrentUserId();
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { nome: 'Armarinho', logo: '' } as Config;
      return data as Config;
    } catch {
      return { nome: 'Armarinho', logo: '' } as Config;
    }
  },

  async saveConfig(config: Partial<Config>) {
    const user_id = await getCurrentUserId();

    // Atomic upsert — insert or update on conflict of user_id (primary key)
    const { data, error } = await supabase
      .from('config')
      .upsert(
        [{
          user_id,
          nome: assertRequiredText(config.nome, 'Nome da loja', 80),
          logo: normalizeOptionalText(config.logo, 120000) ?? '',
        }],
        { onConflict: 'user_id' }
      )
      .select();

    if (error) throw error;
    return data[0] as Config;
  }
};
