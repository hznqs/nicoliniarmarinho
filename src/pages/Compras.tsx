import { useEffect, useState } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  Loader2,
  Calendar,
  X,
  ReceiptText,
  CheckCircle2,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { DataService } from '../lib/services';
import type { Compra, Fornecedor, Cartao } from '../lib/services';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { DatePicker } from '../components/ui/DatePicker';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { exportRowsToCsv } from '../lib/export';
import { formatDateBR, formatDateInput } from '../lib/date';
import { useConfirm } from '../contexts/confirm';

export const Compras = () => {
  const confirm = useConfirm();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [filterPagamento, setFilterPagamento] = useState('');
  const [filterBoletoStatus, setFilterBoletoStatus] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    valor: 0,
    data: formatDateInput(),
    fornecedorId: '',
    formaPagamento: 'avista' as Compra['formaPagamento'],
    cartaoId: '',
    boletoVencimento: '',
    boletoCodigo: '',
    boletoPago: false,
    boletoDataPagamento: '',
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
    setFormError(null);
    if (compra) {
      setSelectedCompra(compra);
      setFormData({
        valor: compra.valor,
        data: compra.data,
        fornecedorId: compra.fornecedorId,
        formaPagamento: compra.formaPagamento || (compra.cartaoId ? 'cartao' : 'avista'),
        cartaoId: compra.cartaoId || '',
        boletoVencimento: compra.boletoVencimento || '',
        boletoCodigo: compra.boletoCodigo || '',
        boletoPago: Boolean(compra.boletoPago),
        boletoDataPagamento: compra.boletoDataPagamento || '',
        descricao: compra.descricao || ''
      });
    } else {
      setSelectedCompra(null);
      setFormData({
        valor: 0,
        data: formatDateInput(),
        fornecedorId: '',
        formaPagamento: 'avista',
        cartaoId: '',
        boletoVencimento: '',
        boletoCodigo: '',
        boletoPago: false,
        boletoDataPagamento: '',
        descricao: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (formData.formaPagamento === 'cartao' && !formData.cartaoId) {
        setFormError('Selecione um cartão para compras no cartão.');
        return;
      }

      if (formData.formaPagamento === 'boleto' && !formData.boletoVencimento) {
        setFormError('Informe o vencimento do boleto.');
        return;
      }

      const payload: Omit<Compra, 'id' | 'fornecedores' | 'cartoes'> = {
        ...formData,
        cartaoId: formData.formaPagamento === 'cartao' ? formData.cartaoId : null,
        boletoVencimento: formData.formaPagamento === 'boleto' ? formData.boletoVencimento : null,
        boletoCodigo: formData.formaPagamento === 'boleto' ? formData.boletoCodigo : '',
        boletoPago: formData.formaPagamento === 'boleto' ? formData.boletoPago : false,
        boletoDataPagamento: formData.formaPagamento === 'boleto' && formData.boletoPago ? formData.boletoDataPagamento : null,
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
      setFormError('Não foi possível salvar esta compra. Confira os campos e tente novamente.');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir compra?',
      message: 'Esta compra será removida do histórico e dos controles financeiros.',
      confirmLabel: 'Excluir compra',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await DataService.deleteCompra(id);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir compra:', error);
    }
  };

  const handleBoletoPago = async (compra: Compra, pago: boolean) => {
    const ok = await confirm({
      title: pago ? 'Pagar boleto?' : 'Reabrir boleto?',
      message: pago
        ? 'O boleto será marcado como pago e deixará de aparecer como pendência.'
        : 'O boleto voltará a aparecer como pendente no calendário e na lista.',
      confirmLabel: pago ? 'Pagar boleto' : 'Reabrir boleto',
      tone: pago ? 'success' : 'warning',
    });
    if (!ok) return;

    try {
      await DataService.setBoletoPago(compra.id, pago);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar boleto:', error);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getFormaPagamento = (compra: Compra) => compra.formaPagamento || (compra.cartaoId ? 'cartao' : 'avista');

  const today = formatDateInput();

  const getBoletoStatus = (compra: Compra) => {
    if (getFormaPagamento(compra) !== 'boleto') return '';
    if (compra.boletoPago) return 'pago';
    if (compra.boletoVencimento && compra.boletoVencimento < today) return 'vencido';
    return 'aberto';
  };

  const getPaymentBadge = (compra: Compra) => {
    const forma = getFormaPagamento(compra);
    if (forma === 'cartao') {
      return {
        label: compra.cartoes?.nome || 'Cartão',
        className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      };
    }
    if (forma === 'boleto') {
      return {
        label: `Boleto ${compra.boletoPago ? 'pago' : 'aberto'}`,
        className: compra.boletoPago
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
    }
    return {
      label: 'À vista',
      className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    };
  };

  const exportToExcel = async () => {
    const dataToExport = filteredCompras.map(c => ({
      Data: formatDateBR(c.data),
      Fornecedor: c.fornecedores?.nome || 'N/A',
      'Forma de pagamento': getPaymentBadge(c).label,
      Cartão: c.cartoes?.nome || '',
      'Vencimento boleto': formatDateBR(c.boletoVencimento),
      'Código boleto': c.boletoCodigo || '',
      'Status boleto': getFormaPagamento(c) === 'boleto' ? (c.boletoPago ? 'Pago' : 'Em aberto') : '',
      'Pagamento boleto': formatDateBR(c.boletoDataPagamento),
      Valor: c.valor,
      Descrição: c.descricao || ''
    }));

    exportRowsToCsv(dataToExport, 'compras_armarinho.csv');
  };

  const filteredCompras = compras.filter(c => {
    const matchMonth = filterMonth ? c.data.startsWith(filterMonth) : true;
    const matchForn = filterFornecedor ? c.fornecedorId === filterFornecedor : true;
    const forma = getFormaPagamento(c);
    const matchPagamento = filterPagamento.startsWith('cartao:')
      ? c.cartaoId === filterPagamento.replace('cartao:', '')
      : filterPagamento
        ? forma === filterPagamento
        : true;
    const matchBoletoStatus = filterBoletoStatus ? getBoletoStatus(c) === filterBoletoStatus : true;
    return matchMonth && matchForn && matchPagamento && matchBoletoStatus;
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
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
                value={filterPagamento}
                onChange={setFilterPagamento}
                placeholder="Todos pagamentos"
                options={[
                  { value: 'avista', label: 'À vista' },
                  { value: 'boleto', label: 'Boleto' },
                  ...cartoes.map(c => ({ value: `cartao:${c.id}`, label: `Cartão: ${c.nome}` }))
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                Status do Boleto
              </label>
              <Select 
                value={filterBoletoStatus}
                onChange={setFilterBoletoStatus}
                placeholder="Todos boletos"
                options={[
                  { value: 'aberto', label: 'Abertos' },
                  { value: 'vencido', label: 'Vencidos' },
                  { value: 'pago', label: 'Pagos' },
                ]}
              />
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => { setFilterMonth(''); setFilterFornecedor(''); setFilterPagamento(''); setFilterBoletoStatus(''); }}
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
                filteredCompras.map((compra) => {
                  const badge = getPaymentBadge(compra);
                  return (
                  <tr 
                    key={compra.id}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4" data-label="Data">
                      <div className="text-zinc-300 text-sm">{formatDateBR(compra.data)}</div>
                    </td>
                    <td className="px-6 py-4" data-label="Fornecedor">
                      <div className="font-semibold text-white">{compra.fornecedores?.nome || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4" data-label="Pagamento">
                      <div className="flex flex-col items-start md:items-start gap-1">
                        <span className={`text-xs px-2.5 py-1 rounded-full inline-block font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                        {getFormaPagamento(compra) === 'boleto' && compra.boletoVencimento && (
                          <span className="text-xs text-zinc-500">
                            Vence em {formatDateBR(compra.boletoVencimento)}
                          </span>
                        )}
                        {getFormaPagamento(compra) === 'boleto' && compra.boletoDataPagamento && (
                          <span className="text-xs text-emerald-400">
                            Pago em {formatDateBR(compra.boletoDataPagamento)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" data-label="Valor">
                      <span className="money-text font-bold text-white">{formatCurrency(compra.valor)}</span>
                    </td>
                    <td className="px-6 py-4 text-right" data-label="Ações">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getFormaPagamento(compra) === 'boleto' && (
                          <button
                            type="button"
                            title={compra.boletoPago ? 'Reabrir boleto' : 'Pagar boleto'}
                            onClick={() => handleBoletoPago(compra, !compra.boletoPago)}
                            className={`p-2 rounded-lg transition-all ${
                              compra.boletoPago
                                ? 'text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10'
                                : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10'
                            }`}
                          >
                            {compra.boletoPago ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
                          </button>
                        )}
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
                  );
                })
              )}
            </tbody>
            {!loading && filteredCompras.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-800/30 border-t border-zinc-700">
                  <td colSpan={3} className="px-6 py-4 text-right text-zinc-400 font-semibold uppercase tracking-wider text-xs">Total Filtrado:</td>
                  <td colSpan={2} className="px-6 py-4">
                    <span className="money-text text-xl font-bold text-rose-400">{formatCurrency(totalFiltrado)}</span>
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
          {formError && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value ? parseFloat(e.target.value) : 0 })}
              required
            />
            <DatePicker 
              label="Data"
              value={formData.data}
              onChange={(value) => setFormData({ ...formData, data: value })}
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
            <label className="text-sm font-medium text-zinc-400">Forma de Pagamento</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/20 outline-none"
              value={formData.formaPagamento}
              onChange={(e) => setFormData({
                ...formData,
                formaPagamento: e.target.value as Compra['formaPagamento'],
                cartaoId: e.target.value === 'cartao' ? formData.cartaoId : '',
                boletoVencimento: e.target.value === 'boleto' ? formData.boletoVencimento : '',
                boletoCodigo: e.target.value === 'boleto' ? formData.boletoCodigo : '',
                boletoPago: e.target.value === 'boleto' ? formData.boletoPago : false,
                boletoDataPagamento: e.target.value === 'boleto' ? formData.boletoDataPagamento : '',
              })}
            >
              <option value="avista">À vista</option>
              <option value="boleto">Boleto</option>
              <option value="cartao">Cartão de crédito</option>
            </select>
          </div>

          {formData.formaPagamento === 'cartao' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400">Cartão de Crédito</label>
              <select 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/20 outline-none"
                value={formData.cartaoId}
                onChange={(e) => setFormData({ ...formData, cartaoId: e.target.value })}
                required
              >
                <option value="">Selecione um cartão</option>
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          {formData.formaPagamento === 'boleto' && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-800/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <ReceiptText size={18} className="text-primary" />
                Dados do boleto
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePicker 
                  label="Vencimento do boleto"
                  value={formData.boletoVencimento}
                  onChange={(value) => setFormData({ ...formData, boletoVencimento: value })}
                  required
                />
                <Input 
                  label="Código / Linha digitável"
                  placeholder="Opcional"
                  value={formData.boletoCodigo}
                  onChange={(e) => setFormData({ ...formData, boletoCodigo: e.target.value })}
                />
              </div>
              <Checkbox
                label="Boleto já foi pago"
                description="Marque para registrar a data do pagamento."
                checked={formData.boletoPago}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  boletoPago: checked,
                  boletoDataPagamento: checked
                    ? formData.boletoDataPagamento || formatDateInput()
                    : '',
                })}
              />
              {formData.boletoPago && (
                <DatePicker 
                  label="Data do pagamento"
                  value={formData.boletoDataPagamento}
                  onChange={(value) => setFormData({ ...formData, boletoDataPagamento: value })}
                />
              )}
            </div>
          )}

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
