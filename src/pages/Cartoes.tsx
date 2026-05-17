import { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  Loader2,
  Calendar,
  DollarSign,
  Search,
  Eye
} from 'lucide-react';
import { DataService } from '../lib/services';
import type { Cartao, Compra } from '../lib/services';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { exportRowsToCsv } from '../lib/export';
import { dateInputTime, formatDateBR, formatMonthInput } from '../lib/date';
import { useConfirm } from '../contexts/confirm';
import { getCardInvoiceInstallments, getCardInvoiceTotal, getCardPurchaseInstallments } from '../lib/cardInvoices';

export const Cartoes = () => {
  const confirm = useConfirm();
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);
  const [viewingFaturaCartao, setViewingFaturaCartao] = useState<Cartao | null>(null);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [faturaMonth, setFaturaMonth] = useState(formatMonthInput());

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    digitos: '',
    limite: 0,
    fechamento: 1,
    vencimento: 10,
  });

  const fetchData = async () => {
    try {
      const [cards, purchases] = await Promise.all([
        DataService.getCartoes(),
        DataService.getCompras()
      ]);
      setCartoes(cards);
      setCompras(purchases);
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleOpenModal = (cartao: Cartao | null = null) => {
    if (cartao) {
      setEditingCartao(cartao);
      setFormData({
        nome: cartao.nome,
        digitos: cartao.digitos || '',
        limite: cartao.limite || 0,
        fechamento: cartao.fechamento || 1,
        vencimento: cartao.vencimento || 10,
      });
    } else {
      setEditingCartao(null);
      setFormData({ nome: '', digitos: '', limite: 0, fechamento: 1, vencimento: 10 });
    }
    setIsModalOpen(true);
  };

  const handleViewFatura = (cartao: Cartao) => {
    setViewingFaturaCartao(cartao);
    setFaturaMonth(formatMonthInput());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCartao) {
        await DataService.updateCartao(editingCartao.id, formData);
      } else {
        await DataService.createCartao(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir cartão?',
      message: 'Todas as compras associadas ficarão sem cartão. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir cartão',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await DataService.deleteCartao(id);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
    }
  };

  const exportInvoice = async (cartao: Cartao) => {
    const currentMonth = formatMonthInput();
    const invoicePurchases = getCardInvoiceInstallments(compras, cartao, currentMonth);
    
    exportRowsToCsv(invoicePurchases.map(c => ({
      Data: formatDateBR(c.compra.data),
      Parcela: `${c.parcela}/${c.parcelas}`,
      Valor: c.valor,
      Descrição: c.compra.descricao
    })), `fatura_${cartao.nome}_${currentMonth}.csv`);
  };

  const getFaturaAtual = (cartao: Cartao) => {
    const currentMonth = formatMonthInput();
    return getCardInvoiceTotal(compras, cartao, currentMonth);
  };

  const getLimiteDisponivel = (cartao: Cartao) => {
    return Math.max((cartao.limite || 0) - getFaturaAtual(cartao), 0);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredCartoes = cartoes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Cartões de Crédito</h1>
          <p className="text-zinc-400">Gerencie seus cartões e acompanhe as faturas mensais.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text"
              placeholder="Pesquisar cartão..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus size={18} />} className="w-full sm:w-auto">
            Novo Cartão
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCartoes.map((cartao) => (
            <div 
              key={cartao.id}
              className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group flex flex-col h-full"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="p-3 bg-zinc-800 rounded-2xl">
                  <CreditCard className="text-primary" size={24} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(cartao)}
                    className="p-2 text-zinc-500 hover:text-primary transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cartao.id)}
                    className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-6 relative z-10 flex-grow">
                <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-1">Nome do Cartão</h3>
                <p className="text-xl font-bold text-white font-outfit line-clamp-2">{cartao.nome}</p>
                {cartao.digitos && (
                  <p className="text-xs text-zinc-500 mt-1">Final {cartao.digitos}</p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800 relative z-10 min-w-0">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm min-w-0">
                    <Calendar size={14} />
                    <span>Fatura Atual (Mês)</span>
                  </div>
                  <span className="money-text text-white font-bold text-right">{formatCurrency(getFaturaAtual(cartao))}</span>
                </div>
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm min-w-0">
                    <DollarSign size={14} />
                    <span>Limite disponível</span>
                  </div>
                  <span className="money-text text-emerald-400 font-bold text-right">{formatCurrency(getLimiteDisponivel(cartao))}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <span>Fecha dia {cartao.fechamento || '-'}</span>
                  <span className="text-right">Vence dia {cartao.vencimento || '-'}</span>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    fullWidth 
                    size="sm"
                    onClick={() => handleViewFatura(cartao)}
                    leftIcon={<Eye size={16} />}
                  >
                    Ver Compras
                  </Button>
                  <Button 
                    variant="outline" 
                    fullWidth 
                    size="sm"
                    onClick={() => exportInvoice(cartao)}
                    leftIcon={<FileSpreadsheet size={16} />}
                  >
                    Exportar
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {filteredCartoes.length === 0 && (
            <div className="col-span-full py-20 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="text-zinc-600" size={32} />
              </div>
              <p className="text-zinc-500 font-medium">
                {searchTerm ? 'Nenhum cartão encontrado para a busca.' : 'Nenhum cartão cadastrado.'}
              </p>
              {!searchTerm && (
                <button 
                  onClick={() => handleOpenModal()}
                  className="text-primary text-sm font-bold mt-2 hover:underline"
                >
                  Cadastrar agora
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Criar/Editar Cartão */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCartao ? 'Editar Cartão' : 'Novo Cartão'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Nome do Cartão"
            placeholder="Ex: Nubank Pessoal, Itaú Empresa"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Final do Cartão"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={formData.digitos}
              onChange={(e) => setFormData({ ...formData, digitos: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            />
            <Input
              label="Limite (R$)"
              type="number"
              min="0"
              step="0.01"
              value={formData.limite}
              onChange={(e) => setFormData({ ...formData, limite: e.target.value ? parseFloat(e.target.value) : 0 })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Dia de Fechamento"
              type="number"
              min="1"
              max="31"
              value={formData.fechamento}
              onChange={(e) => setFormData({ ...formData, fechamento: e.target.value ? parseInt(e.target.value, 10) : 1 })}
            />
            <Input
              label="Dia de Vencimento"
              type="number"
              min="1"
              max="31"
              value={formData.vencimento}
              onChange={(e) => setFormData({ ...formData, vencimento: e.target.value ? parseInt(e.target.value, 10) : 1 })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingCartao ? 'Salvar Alterações' : 'Cadastrar Cartão'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Fatura/Compras do Cartão */}
      <Modal
        isOpen={!!viewingFaturaCartao}
        onClose={() => setViewingFaturaCartao(null)}
        title={`Fatura - ${viewingFaturaCartao?.nome}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <span className="text-zinc-400 text-sm font-medium flex items-center gap-2">
              <Calendar size={16} /> Mês de referência:
            </span>
            <div className="w-48">
              <Select 
                value={faturaMonth}
                onChange={setFaturaMonth}
                placeholder="Selecione..."
                options={Array.from(new Set([
                  formatMonthInput(),
                  ...(viewingFaturaCartao
                    ? compras
                      .filter(c => c.cartaoId === viewingFaturaCartao.id)
                      .flatMap(c => getCardPurchaseInstallments(c, viewingFaturaCartao).map((installment) => installment.mes))
                    : [])
                ])).sort().reverse().map(m => {
                  const [ano, mes] = m.split('-');
                  const date = new Date(parseInt(ano), parseInt(mes) - 1);
                  return {
                    value: m,
                    label: date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, str => str.toUpperCase())
                  };
                })}
              />
            </div>
          </div>
          
          <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {viewingFaturaCartao && getCardInvoiceInstallments(compras, viewingFaturaCartao, faturaMonth)
              .sort((a, b) => dateInputTime(b.compra.data) - dateInputTime(a.compra.data) || b.parcela - a.parcela)
              .map((installment) => (
                <div key={`${installment.compra.id}-${installment.parcela}`} className="p-4 bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group min-w-0">
                  <div className="min-w-0">
                    <div className="text-white text-sm font-semibold mb-1">{formatDateBR(installment.compra.data)}</div>
                    <div className="text-zinc-500 text-xs truncate max-w-[200px] sm:max-w-[280px]">
                      {installment.compra.descricao || 'Sem descrição'}
                    </div>
                    <div className="text-xs text-primary mt-1 font-semibold">
                      Parcela {installment.parcela}/{installment.parcelas}
                    </div>
                  </div>
                  <div className="money-text text-rose-400 font-bold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 sm:text-right">
                    {formatCurrency(installment.valor)}
                  </div>
                </div>
              ))}
            
            {(!viewingFaturaCartao || getCardInvoiceInstallments(compras, viewingFaturaCartao, faturaMonth).length === 0) && (
              <div className="text-center py-10 flex flex-col items-center justify-center bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                <DollarSign className="w-10 h-10 text-zinc-600 mb-3" />
                <span className="text-zinc-500 font-medium">Nenhuma compra neste cartão.</span>
                <span className="text-zinc-600 text-sm mt-1">Tente selecionar outro mês.</span>
              </div>
            )}
          </div>
          
          <div className="pt-4 mt-2 border-t border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 min-w-0">
            <span className="text-zinc-400 font-medium">Total da Fatura:</span>
            <span className="money-text stat-card-value text-2xl font-bold text-white font-outfit sm:text-right">
              {formatCurrency(
                viewingFaturaCartao
                  ? getCardInvoiceTotal(compras, viewingFaturaCartao, faturaMonth)
                  : 0
              )}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
