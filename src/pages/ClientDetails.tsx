import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { api, Client, Transaction } from '../lib/api';
import { formatCurrency, formatDate, formatDateOnly } from '../lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'sale' | 'payment'>('sale');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [clientData, transactionsData] = await Promise.all([
        api.getClient(Number(id)),
        api.getTransactions(Number(id))
      ]);
      setClient(clientData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    let normalizedAmount = amount;
    if (normalizedAmount.includes(',')) {
      normalizedAmount = normalizedAmount.replace(/\./g, '').replace(',', '.');
    }
    const parsedAmount = Number(normalizedAmount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }

    if (!date) {
      alert('Por favor, insira uma data válida.');
      return;
    }

    try {
      await api.createTransaction({
        client_id: Number(id),
        type,
        amount: parsedAmount,
        description,
        date: new Date(date).toISOString(),
        due_date: type === 'sale' && dueDate ? new Date(dueDate).toISOString() : undefined
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setDueDate('');
      setDate(new Date().toISOString().split('T')[0]);
      fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao criar transação');
    }
  };

  const handleDeleteTransaction = async (txId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await api.deleteTransaction(txId);
      fetchData();
    } catch (error) {
      alert('Erro ao excluir transação');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>;
  if (!client) return <div className="p-8 text-center text-zinc-500">Cliente não encontrado.</div>;

  const totalSales = transactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0);
  const totalPayments = transactions.filter(t => t.type === 'payment').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalSales - totalPayments;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/clients" className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{client.name}</h2>
          <p className="text-sm text-zinc-500">{client.phone || 'Sem telefone'} • {client.email || 'Sem email'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-zinc-200 p-5">
          <dt className="text-sm font-medium text-zinc-500 truncate">Total Comprado</dt>
          <dd className="mt-1 text-2xl font-semibold text-zinc-900">{formatCurrency(totalSales)}</dd>
        </div>
        <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-zinc-200 p-5">
          <dt className="text-sm font-medium text-zinc-500 truncate">Total Pago</dt>
          <dd className="mt-1 text-2xl font-semibold text-emerald-600">{formatCurrency(totalPayments)}</dd>
        </div>
        <div className={`bg-white overflow-hidden rounded-xl shadow-sm border border-zinc-200 p-5 ${balance > 0 ? 'bg-rose-50 border-rose-200' : balance < 0 ? 'bg-emerald-50 border-emerald-200' : ''}`}>
          <dt className="text-sm font-medium text-zinc-500 truncate">Saldo (Dívida)</dt>
          <dd className={`mt-1 text-2xl font-semibold ${balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
            {formatCurrency(balance)}
          </dd>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-zinc-200">
          <h3 className="text-lg leading-6 font-medium text-zinc-900">Histórico de Transações</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Vencimento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Valor</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-zinc-500">Nenhuma transação registrada.</td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{formatDate(t.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{t.due_date ? formatDateOnly(t.due_date) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {t.type === 'sale' ? 'Venda' : 'Pagamento'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">{t.description || '-'}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      t.type === 'payment' ? 'text-emerald-600' : 'text-zinc-900'
                    }`}>
                      {t.type === 'payment' ? '+' : ''}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova Transação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-zinc-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <form onSubmit={handleCreateTransaction}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-zinc-900" id="modal-title">Nova Transação</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Tipo</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                      >
                        <option value="sale">Venda (Cliente deve)</option>
                        <option value="payment">Pagamento (Cliente pagou)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Valor (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0,00"
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Data da Transação</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Descrição</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Produto X, Parcela 1/3..."
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
                    {type === 'sale' && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-700">Data de Vencimento (Opcional)</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-zinc-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm">
                    Salvar
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
