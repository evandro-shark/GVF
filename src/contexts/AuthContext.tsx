import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, User, Company } from '../lib/api';

interface AuthContextType {
  user: User | null;
  companies: Company[];
  activeCompany: Company | null;
  isLoading: boolean;
  login: (token: string, user: User, companies: Company[]) => void;
  logout: () => void;
  setActiveCompany: (company: Company) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await api.getMe();
          setUser(data.user);
          setCompanies(data.companies);
          
          const savedCompanyId = localStorage.getItem('activeCompanyId');
          if (savedCompanyId) {
            const company = data.companies.find((c: Company) => c.id === Number(savedCompanyId));
            if (company) {
              setActiveCompanyState(company);
              api.setActiveCompanyId(company.id);
            } else if (data.companies.length > 0) {
              setActiveCompanyState(data.companies[0]);
              api.setActiveCompanyId(data.companies[0].id);
            }
          } else if (data.companies.length > 0) {
            setActiveCompanyState(data.companies[0]);
            api.setActiveCompanyId(data.companies[0].id);
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('activeCompanyId');
        }
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth errors from api.ts
    const handleAuthError = () => {
      setUser(null);
      setCompanies([]);
      setActiveCompanyState(null);
      localStorage.removeItem('token');
      localStorage.removeItem('activeCompanyId');
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  const login = (token: string, userData: User, userCompanies: Company[]) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setCompanies(userCompanies);
    if (userCompanies.length > 0) {
      setActiveCompanyState(userCompanies[0]);
      localStorage.setItem('activeCompanyId', String(userCompanies[0].id));
      api.setActiveCompanyId(userCompanies[0].id);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeCompanyId');
    setUser(null);
    setCompanies([]);
    setActiveCompanyState(null);
  };

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company);
    localStorage.setItem('activeCompanyId', String(company.id));
    api.setActiveCompanyId(company.id);
  };

  return (
    <AuthContext.Provider value={{ user, companies, activeCompany, isLoading, login, logout, setActiveCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
