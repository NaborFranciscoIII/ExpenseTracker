import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('expense_tracker_token'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('expense_tracker_user_id'));

  const login = (newToken: string, newUserId: string) => {
    localStorage.setItem('expense_tracker_token', newToken);
    localStorage.setItem('expense_tracker_user_id', newUserId);
    setToken(newToken);
    setUserId(newUserId);
  };

  const logout = () => {
    localStorage.removeItem('expense_tracker_token');
    localStorage.removeItem('expense_tracker_user_id');
    setToken(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ token, userId, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be nested within an AuthProvider');
  return context;
};