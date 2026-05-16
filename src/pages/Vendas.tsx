import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  Loader2,
  Calendar,
  X,
  PackagePlus,
  Minus,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import { DataService } from '../lib/services';
import type { Produto, Venda, VendaItemInput } from '../lib/services';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/DatePicker';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { getErrorMessage } from '../lib/error';
import { exportRowsToCsv } from '../lib/export';
import { formatDateBR, formatDateInput } from '../lib/date';
import { useConfirm } from '../contexts/confirm';

interface SaleLine extends VendaItemInput {
  localId: string;
}

export const Vendas = () => {
  const confirm = useConfirm();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    valor: '',
    data: formatDateInput(),
    descricao: ''
  });

  const fetchVendas = async () => {
    try {
      setError(null);
      const [data, produtosData] = await Promise.all([
        DataService.getVendas(),
        DataService.getProdutos().catch(() => [] as Produto[])
      ]);
      setVendas(data);
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      setError('Não foi possível carregar vendas ou produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVendas();
  }, []);

  const handleOpenModal = (venda: Venda | null = null) => {
    if (venda) {
      setSelectedVenda(venda);
      setFormData({
        valor: venda.valor.toFixed(2),
        data: venda.data,
        descricao: venda.descricao || ''
      });
      setSaleLines((venda.venda_itens || []).map((item) => ({
        localId: item.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
      })));
    } else {
      setSelectedVenda(null);
      setFormData({
        valor: '',
        data: formatDateInput(),
        descricao: ''
      });
      setSaleLines([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const items = saleLines.map(({ produtoId, quantidade, precoUnitario }) => ({
        produtoId,
        quantidade,
        precoUnitario,
      }));
      const payload = {
        ...formData,
        valor: saleLines.length ? itemsTotal : Number(formData.valor || 0),
      };

      if (selectedVenda) {
        await DataService.updateVenda(selectedVenda.id, payload, items);
      } else {
        await DataService.createVenda(payload, items);
      }
      setIsModalOpen(false);
      fetchVendas();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar venda.'));
      console.error('Erro ao salvar venda:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir venda?',
      message: 'A venda será removida e os itens vinculados podem retornar ao estoque.',
      confirmLabel: 'Excluir venda',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await DataService.deleteVenda(id);
      fetchVendas();
    } catch (error) {
      setError(getErrorMessage(error, 'Erro ao excluir venda.'));
      console.error('Erro ao excluir venda:', error);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatMoneyInput = (value: string) => {
    if (!value) return '';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '';
  };

  const exportToExcel = async () => {
    exportRowsToCsv(filteredVendas.map(v => ({
      Data: formatDateBR(v.data),
      Valor: v.valor,
      Produtos: getItemsSummary(v),
      Descrição: v.descricao
    })), 'vendas_armarinho.csv');
  };

  const filteredVendas = vendas.filter(v => {
    const matchMonth = filterMonth ? v.data.startsWith(filterMonth) : true;
    const matchDay = filterDay ? v.data === filterDay : true;
    return matchMonth && matchDay;
  });

  const totalFiltrado = filteredVendas.reduce((acc, v) => acc + v.valor, 0);

  const months = Array.from(new Set(vendas.map(v => v.data.slice(0, 7)))).sort().reverse();
  const availableProducts = produtos.filter((produto) => produto.ativo);
  const itemsTotal = saleLines.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);

  const getProduct = (produtoId: string) => {
    return produtos.find((produto) => produto.id === produtoId);
  };

  const getItemsSummary = (venda: Venda) => {
    const items = venda.venda_itens || [];
    if (!items.length) return 'Venda rápida';
    return items
      .map((item) => `${item.quantidade}x ${item.produtos?.nome || 'Produto'}`)
      .join(', ');
  };

  const addProductLine = () => {
    const firstProduct = availableProducts.find((produto) => produto.estoque > 0) || availableProducts[0];
    if (!firstProduct) return;
    setSaleLines((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        produtoId: firstProduct.id,
        quantidade: 1,
        precoUnitario: firstProduct.precoVenda,
      },
    ]);
  };

  const updateLine = (localId: string, patch: Partial<SaleLine>) => {
    setSaleLines((current) => current.map((line) => {
      if (line.localId !== localId) return line;
      const next = { ...line, ...patch };
      if (patch.produtoId) {
        const produto = getProduct(patch.produtoId);
        next.precoUnitario = produto?.precoVenda ?? next.precoUnitario;
        next.quantidade = 1;
      }
      return next;
    }));
  };

  const removeLine = (localId: string) => {
    setSaleLines((current) => current.filter((line) => line.localId !== localId));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Gestão de Vendas</h1>
          <p className="text-zinc-400">Registre e acompanhe as entradas financeiras do seu negócio.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToExcel} leftIcon={<FileSpreadsheet size={18} />}>
            Exportar
          </Button>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus size={18} />}>
            Nova Venda
          </Button>
        </div>
      </header>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden">
        {error && (
          <div className="mx-6 mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        <div className="p-6 border-b border-zinc-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-zinc-800/20">
          <h3 className="text-lg font-semibold text-white">Listagem de Vendas</h3>
          <div className="filter-toolbar">
            <div className="filter-field">
              <span className="filter-label">Mês</span>
              <Select 
                value={filterMonth}
                onChange={setFilterMonth}
                placeholder="Todos os meses"
                className="w-full"
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
            <div className="filter-field">
              <span className="filter-label">Dia</span>
              <DatePicker
                value={filterDay}
                onChange={setFilterDay}
                placeholder="Todos os dias"
                className="w-full"
              />
            </div>
            {(filterMonth || filterDay) && (
              <button 
                type="button"
                title="Limpar filtros"
                onClick={() => { setFilterMonth(''); setFilterDay(''); }}
                className="filter-clear-button text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="responsive-table">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/30">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Itens</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor</th>
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
              ) : filteredVendas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    Nenhuma venda registrada para este período.
                  </td>
                </tr>
              ) : (
                filteredVendas.map((venda) => (
                  <tr 
                    key={venda.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4" data-label="Data">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Calendar size={16} className="text-zinc-500" />
                        <span>{formatDateBR(venda.data)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4" data-label="Itens">
                      <div className="max-w-xs truncate text-sm text-zinc-400">
                        {getItemsSummary(venda)}
                      </div>
                    </td>
                    <td className="px-6 py-4" data-label="Valor">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded text-emerald-400">
                          <TrendingUp size={14} />
                        </div>
                        <span className="money-text font-bold text-white">{formatCurrency(venda.valor)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" data-label="Ações">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(venda)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(venda.id)}
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
            {!loading && filteredVendas.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-800/30">
                  <td colSpan={2} className="px-6 py-4 text-right text-zinc-400 font-semibold uppercase tracking-wider">Total do Período:</td>
                  <td colSpan={2} className="px-6 py-4">
                    <span className="money-text text-xl font-bold text-emerald-400">{formatCurrency(totalFiltrado)}</span>
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
        title={selectedVenda ? 'Editar Venda' : 'Registrar Venda'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label={saleLines.length ? 'Total Calculado (R$)' : 'Valor da Venda (R$)'}
              type="number"
              step="0.01"
              min="0"
              value={saleLines.length ? itemsTotal.toFixed(2) : formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              onBlur={() => setFormData((current) => ({
                ...current,
                valor: formatMoneyInput(current.valor),
              }))}
              readOnly={saleLines.length > 0}
              required
            />
            <DatePicker 
              label="Data"
              value={formData.data}
              onChange={(value) => setFormData({ ...formData, data: value })}
              required
            />
          </div>
          <Input 
            label="Descrição (Opcional)"
            placeholder="Ex: Venda de barbante e agulhas"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          />

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-zinc-800 bg-zinc-800/20">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Boxes size={17} className="text-primary" />
                  Produtos na venda
                </h4>
                <p className="text-xs text-zinc-500 mt-1">Opcional. Ao adicionar itens, o estoque é baixado automaticamente.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProductLine}
                leftIcon={<PackagePlus size={16} />}
                disabled={availableProducts.length === 0}
              >
                Adicionar Produto
              </Button>
            </div>

            <div className="p-4 space-y-3">
              {saleLines.length === 0 ? (
                <div className="text-center py-7 border border-dashed border-zinc-800 rounded-xl">
                  <p className="text-sm text-zinc-500">Venda rápida sem produtos vinculados.</p>
                </div>
              ) : (
                saleLines.map((line) => {
                  const produto = getProduct(line.produtoId);
                  const subtotal = line.quantidade * line.precoUnitario;
                  return (
                    <div key={line.localId} className="grid grid-cols-1 lg:grid-cols-[1fr_110px_130px_120px_44px] gap-3 items-end rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-zinc-500">Produto</label>
                        <select
                          value={line.produtoId}
                          onChange={(e) => updateLine(line.localId, { produtoId: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                          {availableProducts.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nome} {item.sku ? `(${item.sku})` : ''} - {item.estoque} un.
                            </option>
                          ))}
                        </select>
                        {produto && produto.estoque <= produto.estoqueMinimo && (
                          <p className="text-[11px] text-amber-300">Estoque baixo: {produto.estoque} un.</p>
                        )}
                      </div>
                      <Input
                        label="Qtd."
                        type="number"
                        min="1"
                        value={line.quantidade}
                        onChange={(e) => updateLine(line.localId, { quantidade: e.target.value ? parseInt(e.target.value, 10) : 1 })}
                        required
                      />
                      <Input
                        label="Preço Unit."
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.precoUnitario}
                        onChange={(e) => updateLine(line.localId, { precoUnitario: e.target.value ? parseFloat(e.target.value) : 0 })}
                        required
                      />
                      <div className="space-y-1.5">
                        <span className="block text-xs font-bold uppercase text-zinc-500">Subtotal</span>
                        <div className="money-text min-h-[42px] flex items-center rounded-xl border border-zinc-800 px-3 py-2 text-sm font-bold text-emerald-300">
                          {formatCurrency(subtotal)}
                        </div>
                      </div>
                      <button
                        type="button"
                        title="Remover produto"
                        onClick={() => removeLine(line.localId)}
                        className="h-[42px] rounded-xl border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors flex items-center justify-center"
                      >
                        <Minus size={17} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {selectedVenda ? 'Salvar Alterações' : 'Registrar Venda'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
