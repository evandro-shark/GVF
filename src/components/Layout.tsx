import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Users, ReceiptText, Menu, LogOut, Building2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCompanyMenuOpen, setCompanyMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, companies, activeCompany, logout, setActiveCompany } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Transações', href: '/transactions', icon: ReceiptText },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 shrink-0">
          <h1 className="text-xl font-semibold text-zinc-900">FinDash</h1>
        </div>
        
        {/* Company Selector */}
        {companies.length > 0 && activeCompany && (
          <div className="p-4 border-b border-zinc-200 relative">
            <button 
              onClick={() => setCompanyMenuOpen(!isCompanyMenuOpen)}
              className="w-full flex items-center justify-between bg-zinc-50 hover:bg-zinc-100 p-2 rounded-lg border border-zinc-200 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="flex flex-col items-start truncate">
                  <span className="text-sm font-medium text-zinc-900 truncate">{activeCompany.name}</span>
                  <span className="text-xs text-zinc-500 truncate">{activeCompany.cnpj}</span>
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isCompanyMenuOpen && "rotate-180")} />
            </button>

            {isCompanyMenuOpen && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="max-h-48 overflow-y-auto">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => {
                        setActiveCompany(company);
                        setCompanyMenuOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors",
                        activeCompany.id === company.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-zinc-700"
                      )}
                    >
                      <div className="truncate">{company.name}</div>
                      <div className="text-xs text-zinc-500 truncate">{company.cnpj}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
                             (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-700" : "text-zinc-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-zinc-200 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-zinc-900 truncate">{user.name}</span>
                <span className="text-xs text-zinc-500 truncate">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center px-4 sm:px-6 lg:px-8 bg-white border-b border-zinc-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="ml-4 text-lg font-semibold text-zinc-900">FinDash</h1>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
