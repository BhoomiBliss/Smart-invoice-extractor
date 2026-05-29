import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  user: { id: string; name: string; email: string; role: string } | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedToken = localStorage.getItem('invoice_session_token');
    const cachedUser = localStorage.getItem('invoice_session_user');
    
    if (cachedToken && cachedUser) {
      setToken(cachedToken);
      setUser(JSON.parse(cachedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post('/api/v1/auth/login', { email, password });
    const { token: jwt, user: profile } = response.data.data;
    
    localStorage.setItem('invoice_session_token', jwt);
    localStorage.setItem('invoice_session_user', JSON.stringify(profile));
    
    setToken(jwt);
    setUser(profile);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await axios.post('/api/v1/auth/signup', { name, email, password });
    const { token: jwt, user: profile } = response.data.data;
    
    localStorage.setItem('invoice_session_token', jwt);
    localStorage.setItem('invoice_session_user', JSON.stringify(profile));
    
    setToken(jwt);
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('invoice_session_token');
    localStorage.removeItem('invoice_session_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export default AuthContext;
