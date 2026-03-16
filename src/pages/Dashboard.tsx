import { useEffect, useState } from 'react';
import { api, DashboardStats } from '../lib/api';
import { formatCurrency, formatDate, formatDateOnly } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  if (!stats) return null;

  const statCards = [
    {
      name: 'Saldo Líquido',
      value: stats.netBalance,
      icon: DollarSign,
      color: stats.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: stats.netBalance >= 0 ? 'bg-emerald-100' : 'bg-red-100',
    },
    {
      name: 'Total Recebido',
      value: stats.totalReceived,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      name: 'Total Despesas',
      value: stats.totalExpenses,
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
    },
    {
      name: 'A Receber (Clientes)',
      value: stats.accountsReceivable,
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Visão Geral</h2>
        <p className="text-sm text-zinc-500">Acompanhe o desempenho financeiro do seu negócio.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden rounded-xl shadow-sm border border-zinc-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-zinc-500 truncate">{stat.name}</dt>
                    <dd>
                      <div className="text-lg font-semibold text-zinc-900">
                        {formatCurrency(stat.value)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-medium text-zinc-900 mt-8 mb-4">Projeção de Recebimentos</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-zinc-200 p-5">
            <dt className="text-sm font-medium text-zinc-500 truncate">A Receber Hoje</dt>
            <dd className="mt-1 text-2xl font-semibold text-indigo-600">
              {formatCurrency(stats.receivableToday)}
            </dd>
          </div>
          <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-zinc-200 p-5">
            <dt className="text-sm font-medium text-zinc-500 truncate">A Receber no Mês</dt>
            <dd className="mt-1 text-2xl font-semibold text-indigo-600">
              {formatCurrency(stats.receivableMonth)}
            </dd>
          </div>
          <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-zinc-200 p-5">
            <dt className="text-sm font-medium text-zinc-500 truncate">A Receber no Ano</dt>
            <dd className="mt-1 text-2xl font-semibold text-indigo-600">
              {formatCurrency(stats.receivableYear)}
            </dd>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-zinc-200">
          <h3 className="text-lg leading-6 font-medium text-zinc-900">Transações Recentes</h3>
          <Link to="/transactions" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Data
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Vencimento
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Cliente/Descrição
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {stats.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-zinc-500">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              ) : (
                stats.recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                      {transaction.due_date ? formatDateOnly(transaction.due_date) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'sale' ? 'bg-blue-100 text-blue-800' :
                        transaction.type === 'payment' ? 'bg-emerald-100 text-emerald-800' :
                        transaction.type === 'income' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {transaction.type === 'sale' ? 'Venda' :
                         transaction.type === 'payment' ? 'Pagamento' :
                         transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                      {transaction.client_name || transaction.description || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      ['payment', 'income'].includes(transaction.type) ? 'text-emerald-600' : 
                      transaction.type === 'expense' ? 'text-rose-600' : 'text-zinc-900'
                    }`}>
                      {['payment', 'income'].includes(transaction.type) ? '+' : 
                       transaction.type === 'expense' ? '-' : ''}
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
