import React, { useEffect, useState } from 'react';
import { api, Transaction } from '../lib/api';
import { formatCurrency, formatDate, formatDateOnly } from '../lib/utils';
import { Plus, Trash2 } from 'lucide-react';

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const fetchTransactions = () => {
    setIsLoading(true);
    api.getTransactions()
      .then(setTransactions)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransaction({
        type,
        amount: Number(amount.replace(',', '.')),
        description
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      fetchTransactions();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao criar transação');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await api.deleteTransaction(id);
      fetchTransactions();
    } catch (error) {
      alert('Erro ao excluir transação');
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Transações</h2>
          <p className="mt-1 text-sm text-zinc-500">Histórico completo de vendas, pagamentos, receitas e despesas.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa/Receita
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Data</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Vencimento</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tipo</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Cliente/Descrição</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Valor</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-zinc-500">Nenhuma transação encontrada.</td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{formatDate(t.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">{t.due_date ? formatDateOnly(t.due_date) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          t.type === 'sale' ? 'bg-blue-100 text-blue-800' :
                          t.type === 'payment' ? 'bg-emerald-100 text-emerald-800' :
                          t.type === 'income' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {t.type === 'sale' ? 'Venda' :
                           t.type === 'payment' ? 'Pagamento' :
                           t.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                        {t.client_name ? `Cliente: ${t.client_name}` : t.description || '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        ['payment', 'income'].includes(t.type) ? 'text-emerald-600' : 
                        t.type === 'expense' ? 'text-rose-600' : 'text-zinc-900'
                      }`}>
                        {['payment', 'income'].includes(t.type) ? '+' : 
                         t.type === 'expense' ? '-' : ''}
                        {formatCurrency(t.amount)}
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
        )}
      </div>

      {/* Modal Nova Despesa/Receita */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-zinc-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateTransaction}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-zinc-900" id="modal-title">Nova Despesa/Receita Geral</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Tipo</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                      >
                        <option value="expense">Despesa</option>
                        <option value="income">Receita (Outros)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">Descrição</label>
                      <input
                        type="text"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Conta de luz, Internet..."
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
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
