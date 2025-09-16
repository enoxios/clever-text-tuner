import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<{ error?: string }>;
  logout: () => void;
  getAuthToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const ADMIN_PASSWORD = 'admin123';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authToken = localStorage.getItem('app-auth-token');
    console.log('AuthContext: Checking stored token:', authToken ? 'token exists' : 'no token');
    
    if (authToken === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      console.log('AuthContext: User authenticated');
    } else {
      console.log('AuthContext: User not authenticated');
    }
    setLoading(false);
  }, []);

  const login = async (password: string) => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('app-auth-token', password);
      setIsAuthenticated(true);
      console.log('AuthContext: Login successful, token stored');
      return {};
    } else {
      console.log('AuthContext: Login failed - wrong password');
      return { error: 'Falsches Passwort' };
    }
  };

  const logout = () => {
    localStorage.removeItem('app-auth-token');
    setIsAuthenticated(false);
  };

  const getAuthToken = () => {
    return localStorage.getItem('app-auth-token');
  };

  const value = {
    isAuthenticated,
    loading,
    login,
    logout,
    getAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};