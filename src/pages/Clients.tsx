import React, { useEffect, useState } from 'react';
import { api, Client } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const fetchClients = () => {
    setIsLoading(true);
    api.getClients()
      .then(setClients)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClient({ name, phone, email });
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      fetchClients();
    } catch (error) {
      alert('Erro ao criar cliente');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Clientes</h2>
          <p className="mt-1 text-sm text-zinc-500">Gerencie seus clientes e acompanhe saldos.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-200">
          <div className="relative rounded-md shadow-sm max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Carregando...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">Nenhum cliente encontrado.</div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {filteredClients.map((client) => (
              <li key={client.id}>
                <Link to={`/clients/${client.id}`} className="block hover:bg-zinc-50 transition-colors">
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">{client.name}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            (client.balance || 0) > 0 ? 'bg-rose-100 text-rose-800' : 
                            (client.balance || 0) < 0 ? 'bg-emerald-100 text-emerald-800' : 
                            'bg-zinc-100 text-zinc-800'
                          }`}>
                            {(client.balance || 0) > 0 ? 'Deve: ' : 'Crédito: '}
                            {formatCurrency(Math.abs(client.balance || 0))}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-zinc-500">
                            {client.phone || 'Sem telefone'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-5 flex-shrink-0">
                      <ChevronRight className="h-5 w-5 text-zinc-400" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Novo Cliente */}
      {isModalOpen && (
        <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-zinc-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateClient}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-zinc-900" id="modal-title">
                    Novo Cliente
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-zinc-700">Nome *</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">Telefone</label>
                      <input
                        type="text"
                        name="phone"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-zinc-700">Email</label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-zinc-300 rounded-md py-2 px-3 border"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-zinc-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
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
