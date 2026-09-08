import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('gramsetu_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('gramsetu_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('gramsetu_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('gramsetu_token');
        localStorage.removeItem('gramsetu_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('gramsetu_token', token);
    localStorage.setItem('gramsetu_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('gramsetu_token');
    localStorage.removeItem('gramsetu_user');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, logout, loading, isAdmin: user?.role === 'admin', isAgent: user?.role === 'agent' }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
