import { useEffect, useState } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  Loader2,
  X
} from 'lucide-react';
import { DataService } from '../lib/services';
import type { Fornecedor } from '../lib/services';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { exportRowsToCsv } from '../lib/export';

export const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    descricao: ''
  });

  const fetchFornecedores = async () => {
    try {
      const data = await DataService.getFornecedores();
      setFornecedores(data);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFornecedores();
  }, []);

  const handleOpenModal = (fornecedor: Fornecedor | null = null) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData({
        nome: fornecedor.nome,
        categoria: fornecedor.categoria || '',
        descricao: fornecedor.descricao || ''
      });
    } else {
      setEditingFornecedor(null);
      setFormData({ nome: '', categoria: '', descricao: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFornecedor) {
        await DataService.updateFornecedor(editingFornecedor.id, formData);
      } else {
        await DataService.createFornecedor(formData);
      }
      setIsModalOpen(false);
      fetchFornecedores();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
      try {
        await DataService.deleteFornecedor(id);
        fetchFornecedores();
      } catch (error) {
        console.error('Erro ao excluir fornecedor:', error);
      }
    }
  };

  const exportToExcel = async () => {
    exportRowsToCsv(fornecedores.map(f => ({
      Nome: f.nome,
      Categoria: f.categoria || '',
      Descrição: f.descricao
    })), 'fornecedores_armarinho.csv');
  };

  const categorias = Array.from(new Set(fornecedores.map(f => f.categoria).filter(Boolean) as string[])).sort();

  const filteredFornecedores = fornecedores.filter(f => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      f.nome.toLowerCase().includes(term) ||
      f.categoria?.toLowerCase().includes(term) ||
      f.descricao?.toLowerCase().includes(term);
    const matchCategoria = filterCategoria ? f.categoria === filterCategoria : true;
    return matchSearch && matchCategoria;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Fornecedores</h1>
          <p className="text-zinc-400">Gerencie seus contatos e parceiros de suprimentos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToExcel} leftIcon={<FileSpreadsheet size={18} />}>
            Exportar
          </Button>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus size={18} />}>
            Novo Fornecedor
          </Button>
        </div>
      </header>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">Lista de Fornecedores</h3>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(220px,1fr)_220px_auto] gap-3 w-full lg:max-w-3xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text"
                placeholder="Buscar fornecedor..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={filterCategoria}
              onChange={setFilterCategoria}
              placeholder="Todas categorias"
              options={categorias.map(categoria => ({ value: categoria, label: categoria }))}
            />
            {(searchTerm || filterCategoria) && (
              <button
                type="button"
                title="Limpar filtros"
                onClick={() => { setSearchTerm(''); setFilterCategoria(''); }}
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
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição / Observação</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredFornecedores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                filteredFornecedores.map((fornecedor) => (
                  <tr 
                    key={fornecedor.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4" data-label="Nome">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Truck size={20} />
                        </div>
                        <span className="font-medium text-white">{fornecedor.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" data-label="Categoria">
                      <span className="inline-flex rounded-full border border-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                        {fornecedor.categoria || 'Sem categoria'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm max-w-md truncate" data-label="Observação">
                      {fornecedor.descricao || '—'}
                    </td>
                    <td className="px-6 py-4 text-right" data-label="Ações">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(fornecedor)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(fornecedor.id)}
                          className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Nome do Fornecedor"
            placeholder="Ex: Atacadão dos Fios"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <Input
              label="Categoria"
              placeholder="Ex: Linhas, Aviamentos, Embalagens"
              list="fornecedor-categorias"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            />
            <datalist id="fornecedor-categorias">
              {categorias.map((categoria) => (
                <option key={categoria} value={categoria} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400 ml-1">Descrição / Observação</label>
            <textarea 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all min-h-[100px]"
              placeholder="Ex: Fornecedor de linhas e agulhas, entrega nas terças..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingFornecedor ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
