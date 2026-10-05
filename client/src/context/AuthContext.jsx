import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
const IDLE_LOGOUT_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

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

  const logout = useCallback(() => {
    localStorage.removeItem('gramsetu_token');
    localStorage.removeItem('gramsetu_user');
    setUser(null);
  }, []);

  // Auto-logout after 10 minutes with no mouse/keyboard/touch/scroll activity.
  const idleTimerRef = useRef(null);
  useEffect(() => {
    if (!user) return undefined;

    const resetIdleTimer = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(logout, IDLE_LOGOUT_MS);
    };

    resetIdleTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetIdleTimer));

    return () => {
      clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    };
  }, [user, logout]);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      isDeveloper: user?.role === 'developer',
      isAdmin: user?.role === 'admin',
      isHeadOfDistrict: user?.role === 'head_of_district',
      isHeadOfPanchayat: user?.role === 'head_of_panchayat',
      isFieldAgent: user?.role === 'field_agent',
      // Every role above field agent can see a team directory of who reports to them.
      canManageTeam: !!user && user.role !== 'field_agent',
    }),
    [user, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
