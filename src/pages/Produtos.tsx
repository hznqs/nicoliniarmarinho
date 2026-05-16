import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Boxes,
  Edit2,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { DataService } from '../lib/services';
import type { Produto } from '../lib/services';
import { getErrorMessage } from '../lib/error';
import { exportRowsToCsv } from '../lib/export';
import { useConfirm } from '../contexts/confirm';

const initialForm = {
  nome: '',
  sku: '',
  categoria: '',
  estoque: 0,
  estoqueMinimo: 3,
  custo: 0,
  precoVenda: 0,
  ativo: true,
};

export const Produtos = () => {
  const confirm = useConfirm();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const fetchProdutos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DataService.getProdutos();
      setProdutos(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível carregar os produtos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProdutos();
  }, []);

  const categorias = useMemo(() => {
    return Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean) as string[])).sort();
  }, [produtos]);

  const filteredProdutos = useMemo(() => {
    return produtos.filter((produto) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        produto.nome.toLowerCase().includes(term) ||
        produto.sku?.toLowerCase().includes(term) ||
        produto.categoria?.toLowerCase().includes(term);
      const matchesCategory = categoryFilter ? produto.categoria === categoryFilter : true;
      const matchesStatus =
        statusFilter === 'low'
          ? produto.estoque <= produto.estoqueMinimo
          : statusFilter === 'inactive'
            ? !produto.ativo
            : statusFilter === 'active'
              ? produto.ativo
              : true;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [produtos, searchTerm, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const ativos = produtos.filter((p) => p.ativo);
    const baixoEstoque = ativos.filter((p) => p.estoque <= p.estoqueMinimo);
    const valorEstoque = ativos.reduce((acc, p) => acc + p.estoque * p.custo, 0);
    const margemMedia = ativos.length
      ? ativos.reduce((acc, p) => acc + (p.precoVenda - p.custo), 0) / ativos.length
      : 0;

    return { ativos: ativos.length, baixoEstoque: baixoEstoque.length, valorEstoque, margemMedia };
  }, [produtos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const openModal = (produto: Produto | null = null) => {
    setError(null);
    if (produto) {
      setEditingProduto(produto);
      setFormData({
        nome: produto.nome,
        sku: produto.sku || '',
        categoria: produto.categoria || '',
        estoque: produto.estoque,
        estoqueMinimo: produto.estoqueMinimo,
        custo: produto.custo,
        precoVenda: produto.precoVenda,
        ativo: produto.ativo,
      });
    } else {
      setEditingProduto(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingProduto) {
        await DataService.updateProduto(editingProduto.id, formData);
      } else {
        await DataService.createProduto(formData);
      }
      setIsModalOpen(false);
      fetchProdutos();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível salvar o produto.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir produto?',
      message: 'O produto será removido do catálogo e não poderá ser usado em novas vendas.',
      confirmLabel: 'Excluir produto',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await DataService.deleteProduto(id);
      fetchProdutos();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível excluir o produto.'));
    }
  };

  const exportToExcel = async () => {
    exportRowsToCsv(filteredProdutos.map((produto) => ({
      Nome: produto.nome,
      SKU: produto.sku || '',
      Categoria: produto.categoria || '',
      Estoque: produto.estoque,
      'Estoque mínimo': produto.estoqueMinimo,
      Custo: produto.custo,
      'Preço de venda': produto.precoVenda,
      Margem: produto.precoVenda - produto.custo,
      Status: produto.ativo ? 'Ativo' : 'Inativo',
    })), 'produtos_armarinho.csv');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Produtos e Estoque</h1>
          <p className="text-zinc-400">Cadastro de itens, custo, preço e alerta de reposição.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button variant="outline" onClick={exportToExcel} leftIcon={<FileSpreadsheet size={18} />}>
            Exportar
          </Button>
          <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
            Novo Produto
          </Button>
        </div>
      </header>

      <div className="summary-card-grid grid gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 min-w-0 overflow-hidden">
          <span className="text-xs font-semibold uppercase text-zinc-500">Produtos ativos</span>
          <div className="mt-3 flex items-center justify-between gap-3 min-w-0">
            <strong className="stat-card-value text-2xl font-bold text-white">{stats.ativos}</strong>
            <Boxes className="text-primary shrink-0" size={22} />
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 min-w-0 overflow-hidden">
          <span className="text-xs font-semibold uppercase text-zinc-500">Baixo estoque</span>
          <div className="mt-3 flex items-center justify-between gap-3 min-w-0">
            <strong className="stat-card-value text-2xl font-bold text-amber-400">{stats.baixoEstoque}</strong>
            <AlertTriangle className="text-amber-400 shrink-0" size={22} />
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 min-w-0 overflow-hidden">
          <span className="text-xs font-semibold uppercase text-zinc-500">Valor em estoque</span>
          <div className="mt-3 flex flex-col gap-2 min-w-0">
            <strong className="money-text stat-card-value text-2xl font-bold text-white">{formatCurrency(stats.valorEstoque)}</strong>
            <span className="money-text text-sm text-zinc-400">Margem média: {formatCurrency(stats.margemMedia)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 bg-zinc-800/20 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="Todas categorias"
            options={categorias.map((categoria) => ({ value: categoria, label: categoria }))}
          />
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Todos status"
              className="flex-1"
              options={[
                { value: 'active', label: 'Ativos' },
                { value: 'low', label: 'Baixo estoque' },
                { value: 'inactive', label: 'Inativos' },
              ]}
            />
            {(searchTerm || categoryFilter || statusFilter) && (
              <button
                type="button"
                title="Limpar filtros"
                onClick={() => { setSearchTerm(''); setCategoryFilter(''); setStatusFilter(''); }}
                className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        <div className="responsive-table">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/30">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estoque</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Custo</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Venda</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Margem</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredProdutos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-zinc-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                filteredProdutos.map((produto) => {
                  const lowStock = produto.estoque <= produto.estoqueMinimo;
                  return (
                    <tr
                      key={produto.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4" data-label="Produto">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${produto.ativo ? 'bg-primary/10 text-primary' : 'bg-zinc-800 text-zinc-500'}`}>
                            <Archive size={19} />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{produto.nome}</div>
                            <div className="text-xs text-zinc-500">
                              {[produto.sku, produto.categoria].filter(Boolean).join(' · ') || 'Sem SKU'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4" data-label="Estoque">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                          lowStock
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                        }`}>
                          {lowStock && <AlertTriangle size={13} />}
                          {produto.estoque} un.
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-300" data-label="Custo"><span className="money-text">{formatCurrency(produto.custo)}</span></td>
                      <td className="px-6 py-4 text-white font-semibold" data-label="Venda"><span className="money-text">{formatCurrency(produto.precoVenda)}</span></td>
                      <td className="px-6 py-4 text-emerald-400 font-semibold" data-label="Margem"><span className="money-text">{formatCurrency(produto.precoVenda - produto.custo)}</span></td>
                      <td className="px-6 py-4 text-right" data-label="Ações">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="Editar produto"
                            onClick={() => openModal(produto)}
                            className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            title="Excluir produto"
                            onClick={() => handleDelete(produto.id)}
                            className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduto ? 'Editar Produto' : 'Novo Produto'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nome do Produto"
            placeholder="Ex: Linha Anne 500m"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU / Código"
              placeholder="ANNE-500"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
            <Input
              label="Categoria"
              placeholder="Linhas"
              list="produto-categorias"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            />
            <datalist id="produto-categorias">
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Estoque"
              type="number"
              min="0"
              value={formData.estoque}
              onChange={(e) => setFormData({ ...formData, estoque: e.target.value ? parseInt(e.target.value, 10) : 0 })}
              required
            />
            <Input
              label="Estoque Mínimo"
              type="number"
              min="0"
              value={formData.estoqueMinimo}
              onChange={(e) => setFormData({ ...formData, estoqueMinimo: e.target.value ? parseInt(e.target.value, 10) : 0 })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Custo (R$)"
              type="number"
              min="0"
              step="0.01"
              value={formData.custo}
              onChange={(e) => setFormData({ ...formData, custo: e.target.value ? parseFloat(e.target.value) : 0 })}
              required
            />
            <Input
              label="Preço de Venda (R$)"
              type="number"
              min="0"
              step="0.01"
              value={formData.precoVenda}
              onChange={(e) => setFormData({ ...formData, precoVenda: e.target.value ? parseFloat(e.target.value) : 0 })}
              required
            />
          </div>
          <Checkbox
            label="Produto ativo"
            description="Itens inativos ficam fora dos indicadores."
            checked={formData.ativo}
            onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            align="between"
          />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving} leftIcon={<PackagePlus size={18} />}>
              {editingProduto ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
