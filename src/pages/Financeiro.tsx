import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Edit2,
  FileSpreadsheet,
  HandCoins,
  Landmark,
  Loader2,
  Plus,
  Repeat2,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { DatePicker } from '../components/ui/DatePicker';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { exportRowsToCsv } from '../lib/export';
import { DataService } from '../lib/services';
import type { LancamentoFinanceiro, TipoLancamentoFinanceiro } from '../lib/services';
import { formatDateBR, formatDateInput } from '../lib/date';
import { useConfirm } from '../contexts/confirm';

const tipoLabels: Record<TipoLancamentoFinanceiro, string> = {
  custo_fixo: 'Custo fixo',
  prolabore: 'Pró-labore',
  distribuicao_lucro: 'Distribuição de lucro',
};

const tipoStyles: Record<TipoLancamentoFinanceiro, string> = {
  custo_fixo: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  prolabore: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  distribuicao_lucro: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export const Financeiro = () => {
  const confirm = useConfirm();
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState<LancamentoFinanceiro | null>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [formData, setFormData] = useState({
    tipo: 'custo_fixo' as TipoLancamentoFinanceiro,
    descricao: '',
    categoria: '',
    valor: 0,
    data: formatDateInput(),
    recorrente: false,
    observacao: '',
  });

  const fetchData = async () => {
    try {
      const data = await DataService.getLancamentosFinanceiros();
      setLancamentos(data);
    } catch (error) {
      console.error('Erro ao buscar lançamentos financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const months = useMemo(() => (
    Array.from(new Set(lancamentos.map((item) => item.data.slice(0, 7)))).sort().reverse()
  ), [lancamentos]);

  const categorias = useMemo(() => (
    Array.from(new Set(lancamentos.map((item) => item.categoria).filter(Boolean) as string[])).sort()
  ), [lancamentos]);

  const filteredLancamentos = useMemo(() => (
    lancamentos.filter((item) => {
      const matchMonth = filterMonth ? item.data.startsWith(filterMonth) : true;
      const matchTipo = filterTipo ? item.tipo === filterTipo : true;
      const matchCategoria = filterCategoria ? item.categoria === filterCategoria : true;
      return matchMonth && matchTipo && matchCategoria;
    })
  ), [filterCategoria, filterMonth, filterTipo, lancamentos]);

  const resumo = useMemo(() => (
    filteredLancamentos.reduce((acc, item) => {
      acc[item.tipo] += item.valor;
      acc.total += item.valor;
      return acc;
    }, {
      custo_fixo: 0,
      prolabore: 0,
      distribuicao_lucro: 0,
      total: 0,
    })
  ), [filteredLancamentos]);

  const handleOpenModal = (lancamento: LancamentoFinanceiro | null = null) => {
    if (lancamento) {
      setSelectedLancamento(lancamento);
      setFormData({
        tipo: lancamento.tipo,
        descricao: lancamento.descricao,
        categoria: lancamento.categoria || '',
        valor: lancamento.valor,
        data: lancamento.data,
        recorrente: Boolean(lancamento.recorrente),
        observacao: lancamento.observacao || '',
      });
    } else {
      setSelectedLancamento(null);
      setFormData({
        tipo: 'custo_fixo',
        descricao: '',
        categoria: '',
        valor: 0,
        data: formatDateInput(),
        recorrente: false,
        observacao: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        categoria: formData.categoria.trim(),
        observacao: formData.observacao.trim(),
      };

      if (selectedLancamento) {
        await DataService.updateLancamentoFinanceiro(selectedLancamento.id, payload);
      } else {
        await DataService.createLancamentoFinanceiro(payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar lançamento financeiro:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir lançamento?',
      message: 'Este lançamento financeiro será removido do controle. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir lançamento',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await DataService.deleteLancamentoFinanceiro(id);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir lançamento financeiro:', error);
    }
  };

  const exportToCsv = () => {
    exportRowsToCsv(
      filteredLancamentos.map((item) => ({
        Data: formatDateBR(item.data),
        Tipo: tipoLabels[item.tipo],
        Categoria: item.categoria || '',
        Descrição: item.descricao,
        Valor: item.valor,
        Recorrente: item.recorrente ? 'Sim' : 'Não',
        Observação: item.observacao || '',
      })),
      'financeiro_armarinho.csv'
    );
  };

  const clearFilters = () => {
    setFilterMonth('');
    setFilterTipo('');
    setFilterCategoria('');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Financeiro</h1>
          <p className="text-zinc-400">Controle custos fixos, pró-labore e distribuição de lucro.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToCsv} leftIcon={<FileSpreadsheet size={18} />}>
            Exportar
          </Button>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus size={18} />}>
            Novo Lançamento
          </Button>
        </div>
      </header>

      <section className="summary-card-grid grid gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-sm text-zinc-400 font-semibold">Custo fixo</span>
            <WalletCards size={20} className="text-rose-400" />
          </div>
          <strong className="money-text text-2xl font-bold text-white">{formatCurrency(resumo.custo_fixo)}</strong>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-sm text-zinc-400 font-semibold">Pró-labore</span>
            <HandCoins size={20} className="text-sky-400" />
          </div>
          <strong className="money-text text-2xl font-bold text-white">{formatCurrency(resumo.prolabore)}</strong>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-sm text-zinc-400 font-semibold min-w-0 break-words">Distribuição de lucro</span>
            <Landmark size={20} className="text-emerald-400" />
          </div>
          <strong className="money-text text-2xl font-bold text-white">{formatCurrency(resumo.distribuicao_lucro)}</strong>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-sm text-zinc-400 font-semibold">Total filtrado</span>
            <Repeat2 size={20} className="text-primary" />
          </div>
          <strong className="money-text text-2xl font-bold text-primary">{formatCurrency(resumo.total)}</strong>
        </div>
      </section>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-zinc-800/20">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                <Calendar size={12} /> Mês
              </label>
              <Select
                value={filterMonth}
                onChange={setFilterMonth}
                placeholder="Todos os meses"
                options={months.map((month) => {
                  const [ano, mes] = month.split('-');
                  const date = new Date(parseInt(ano), parseInt(mes) - 1);
                  return {
                    value: month,
                    label: date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (str) => str.toUpperCase()),
                  };
                })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Tipo</label>
              <Select
                value={filterTipo}
                onChange={setFilterTipo}
                placeholder="Todos os tipos"
                options={[
                  { value: 'custo_fixo', label: 'Custo fixo' },
                  { value: 'prolabore', label: 'Pró-labore' },
                  { value: 'distribuicao_lucro', label: 'Distribuição de lucro' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Categoria</label>
              <Select
                value={filterCategoria}
                onChange={setFilterCategoria}
                placeholder="Todas categorias"
                options={categorias.map((categoria) => ({ value: categoria, label: categoria }))}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
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
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor</th>
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
              ) : filteredLancamentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredLancamentos.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4" data-label="Data">
                      <div className="text-zinc-300 text-sm">{formatDateBR(item.data)}</div>
                    </td>
                    <td className="px-6 py-4" data-label="Tipo">
                      <span className={`text-xs px-2.5 py-1 rounded-full inline-block font-medium ${tipoStyles[item.tipo]}`}>
                        {tipoLabels[item.tipo]}
                      </span>
                    </td>
                    <td className="px-6 py-4" data-label="Categoria">
                      <span className="text-sm text-zinc-300">{item.categoria || 'Sem categoria'}</span>
                    </td>
                    <td className="px-6 py-4" data-label="Descrição">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{item.descricao}</p>
                        {item.recorrente && <p className="text-xs text-zinc-500 mt-1">Recorrente</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4" data-label="Valor">
                      <span className="money-text font-bold text-white">{formatCurrency(item.valor)}</span>
                    </td>
                    <td className="px-6 py-4 text-right" data-label="Ações">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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
        title={selectedLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Tipo</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/20 outline-none"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoLancamentoFinanceiro })}
                required
              >
                <option value="custo_fixo">Custo fixo</option>
                <option value="prolabore">Pró-labore</option>
                <option value="distribuicao_lucro">Distribuição de lucro</option>
              </select>
            </div>
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value ? parseFloat(e.target.value) : 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              label="Data"
              value={formData.data}
              onChange={(value) => setFormData({ ...formData, data: value })}
              required
            />
            <Input
              label="Categoria"
              placeholder="Ex: Aluguel, Retirada, Impostos"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            />
          </div>

          <Input
            label="Descrição"
            placeholder="Ex: Aluguel da loja"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            required
          />

          <Input
            label="Observação"
            placeholder="Detalhes adicionais"
            value={formData.observacao}
            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
          />

          <Checkbox
            label="Lançamento recorrente"
            description="Use para despesas ou retiradas que se repetem com frequência."
            checked={formData.recorrente}
            onCheckedChange={(checked) => setFormData({ ...formData, recorrente: checked })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {selectedLancamento ? 'Salvar Alterações' : 'Criar Lançamento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
