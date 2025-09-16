import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  session: any | null;
  userInfo: any | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  adminLogin: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const storedAuth = localStorage.getItem('gnb-auth');
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      setUser(authData.user);
      setSession(authData.session);
      setUserInfo(authData.userInfo);
      setIsAdmin(authData.isAdmin);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Simple password check - replace "gnb2024" with your desired password
    if (password === 'gnb2024') {
      const authData = {
        user: { id: '1', username },
        session: { access_token: 'mock-token', user: { id: '1', username } },
        userInfo: { username },
        isAdmin: false
      };
      
      localStorage.setItem('gnb-auth', JSON.stringify(authData));
      setUser(authData.user);
      setSession(authData.session);
      setUserInfo(authData.userInfo);
      setIsAdmin(false);
      
      return {};
    } else {
      return { error: 'Ungültiges Passwort' };
    }
  };

  const adminLogin = async (username: string, password: string) => {
    // Same simple password check for admin
    if (password === 'gnb2024') {
      const authData = {
        user: { id: '1', username },
        session: { access_token: 'mock-token', user: { id: '1', username } },
        userInfo: { username },
        isAdmin: true
      };
      
      localStorage.setItem('gnb-auth', JSON.stringify(authData));
      setUser(authData.user);
      setSession(authData.session);
      setUserInfo(authData.userInfo);
      setIsAdmin(true);
      
      return {};
    } else {
      return { error: 'Ungültiges Admin-Passwort' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('gnb-auth');
    setUser(null);
    setSession(null);
    setUserInfo(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    session,
    userInfo,
    isAdmin,
    loading,
    login,
    adminLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};