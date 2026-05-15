import { useEffect, useState } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  Loader2,
  Calendar,
  X
} from 'lucide-react';
import { DataService } from '../lib/services';
import type { Compra, Fornecedor, Cartao } from '../lib/services';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { exportRowsToCsv } from '../lib/export';

export const Compras = () => {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  
  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [filterCartao, setFilterCartao] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    fornecedorId: '',
    cartaoId: '',
    descricao: ''
  });

  const fetchData = async () => {
    try {
      const [comprasData, fornsData, cardsData] = await Promise.all([
        DataService.getCompras(),
        DataService.getFornecedores(),
        DataService.getCartoes()
      ]);
      setCompras(comprasData);
      setFornecedores(fornsData);
      setCartoes(cardsData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleOpenModal = (compra: Compra | null = null) => {
    if (compra) {
      setSelectedCompra(compra);
      setFormData({
        valor: compra.valor,
        data: compra.data,
        fornecedorId: compra.fornecedorId,
        cartaoId: compra.cartaoId || '',
        descricao: compra.descricao || ''
      });
    } else {
      setSelectedCompra(null);
      setFormData({
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        fornecedorId: '',
        cartaoId: '',
        descricao: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Omit<Compra, 'id' | 'fornecedores' | 'cartoes'> = {
        ...formData,
        cartaoId: formData.cartaoId || null // Send null if empty
      };

      if (selectedCompra) {
        await DataService.updateCompra(selectedCompra.id, payload);
      } else {
        await DataService.createCompra(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta compra?')) {
      try {
        await DataService.deleteCompra(id);
        fetchData();
      } catch (error) {
        console.error('Erro ao excluir compra:', error);
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const exportToExcel = async () => {
    const dataToExport = filteredCompras.map(c => ({
      Data: new Date(c.data).toLocaleDateString('pt-BR'),
      Fornecedor: c.fornecedores?.nome || 'N/A',
      Cartão: c.cartoes?.nome || 'Dinheiro/Pix',
      Valor: c.valor,
      Descrição: c.descricao || ''
    }));

    exportRowsToCsv(dataToExport, 'compras_armarinho.csv');
  };

  const filteredCompras = compras.filter(c => {
    const matchMonth = filterMonth ? c.data.startsWith(filterMonth) : true;
    const matchForn = filterFornecedor ? c.fornecedorId === filterFornecedor : true;
    const matchCard = filterCartao === 'money'
      ? !c.cartaoId
      : filterCartao
        ? c.cartaoId === filterCartao
        : true;
    return matchMonth && matchForn && matchCard;
  });

  const totalFiltrado = filteredCompras.reduce((acc, c) => acc + c.valor, 0);

  const months = Array.from(new Set(compras.map(c => c.data.slice(0, 7)))).sort().reverse();

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Compras</h1>
          <p className="text-zinc-400">Histórico de aquisições e controle de pagamentos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToExcel} leftIcon={<FileSpreadsheet size={18} />}>
            Exportar
          </Button>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus size={18} />}>
            Nova Compra
          </Button>
        </div>
      </header>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Filter Bar */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-800/20">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                <Calendar size={12} /> Mês
              </label>
              <Select 
                value={filterMonth}
                onChange={setFilterMonth}
                placeholder="Todos os meses"
                options={months.map(m => {
                  const [ano, mes] = m.split('-');
                  const date = new Date(parseInt(ano), parseInt(mes) - 1);
                  return {
                    value: m,
                    label: date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, str => str.toUpperCase())
                  };
                })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                Fornecedor
              </label>
              <Select 
                value={filterFornecedor}
                onChange={setFilterFornecedor}
                placeholder="Todos fornecedores"
                options={fornecedores.map(f => ({ value: f.id, label: f.nome }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                Meio de Pagamento
              </label>
              <Select 
                value={filterCartao}
                onChange={setFilterCartao}
                placeholder="Todos pagamentos"
                options={[
                  { value: 'money', label: 'Dinheiro / PIX' },
                  ...cartoes.map(c => ({ value: c.id, label: c.nome }))
                ]}
              />
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => { setFilterMonth(''); setFilterFornecedor(''); setFilterCartao(''); }}
                className="w-full h-[42px] border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <X size={16} /> Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="responsive-table">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/30">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fornecedor</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pagamento</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Nenhuma compra encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCompras.map((compra) => (
                  <tr 
                    key={compra.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4" data-label="Data">
                      <div className="text-zinc-300 text-sm">{new Date(compra.data).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="px-6 py-4" data-label="Fornecedor">
                      <div className="font-semibold text-white">{compra.fornecedores?.nome || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4" data-label="Pagamento">
                      <div className={`text-xs px-2.5 py-1 rounded-full inline-block font-medium ${compra.cartaoId ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {compra.cartoes?.nome || 'Dinheiro / PIX'}
                      </div>
                    </td>
                    <td className="px-6 py-4" data-label="Valor">
                      <span className="font-bold text-white">{formatCurrency(compra.valor)}</span>
                    </td>
                    <td className="px-6 py-4 text-right" data-label="Ações">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(compra)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(compra.id)}
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
            {!loading && filteredCompras.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-800/30 border-t border-zinc-700">
                  <td colSpan={3} className="px-6 py-4 text-right text-zinc-400 font-semibold uppercase tracking-wider text-xs">Total Filtrado:</td>
                  <td colSpan={2} className="px-6 py-4">
                    <span className="text-xl font-bold text-rose-400">{formatCurrency(totalFiltrado)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedCompra ? 'Editar Compra' : 'Registrar Compra'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value ? parseFloat(e.target.value) : 0 })}
              required
            />
            <Input 
              label="Data"
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400">Fornecedor</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.fornecedorId}
              onChange={(e) => setFormData({ ...formData, fornecedorId: e.target.value })}
              required
            >
              <option value="">Selecione um fornecedor</option>
              {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-400">Cartão de Crédito (Opcional)</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.cartaoId}
              onChange={(e) => setFormData({ ...formData, cartaoId: e.target.value })}
            >
              <option value="">Dinheiro / PIX</option>
              {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <Input 
            label="Descrição / Observação"
            placeholder="Ex: Reposição de agulhas de crochê"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {selectedCompra ? 'Salvar Alterações' : 'Registrar Compra'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
