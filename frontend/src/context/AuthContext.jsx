import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/captchaService.js';
import { setUnauthorizedHandler, tokenStore } from '../services/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(tokenStore.get());
  const [user, setUser] = useState(null);

  const logout = useCallback(() => { tokenStore.clear(); setToken(null); setUser(null); }, []);
  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    tokenStore.set(data.token); setToken(data.token); setUser(data.user);
  }, []);

  const value = useMemo(() => ({ token, user, login, logout }), [token, user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
