import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string, type?: string) => Promise<{ error?: string }>;
  logout: () => void;
  getAuthToken: () => string | null;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  currentUser: { username: string; id: string; role?: string } | null;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ username: string; id: string; role?: string } | null>(null);

  useEffect(() => {
    // Check if user has valid session in localStorage
    const authData = localStorage.getItem('app-auth-data');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.user && parsed.session) {
          setIsAuthenticated(true);
          setCurrentUser({
            ...parsed.user,
            role: parsed.user.role || 'user'
          });
          console.log('Restored auth state with role:', parsed.user.role);
        }
      } catch (error) {
        console.error('Failed to parse auth data:', error);
        localStorage.removeItem('app-auth-data');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string, type: string = 'admin') => {
    try {
      console.log('AuthContext: Attempting login for username:', username);
      
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { 
          username, 
          password, 
          type
        }
      });

      if (error) {
        console.log('AuthContext: Login failed - supabase error:', error);
        return { error: 'Anmeldung fehlgeschlagen' };
      }

      if (data?.error) {
        console.log('AuthContext: Login failed - auth error:', data.error);
        return { error: data.error };
      }

      if (data?.user) {
        const authData = {
          user: {
            ...data.user,
            role: data.user.role || 'user'
          },
          session: data.session
        };
        
        localStorage.setItem('app-auth-data', JSON.stringify(authData));
        setIsAuthenticated(true);
        setCurrentUser({
          ...data.user,
          role: data.user.role || 'user'
        });
        console.log('AuthContext: Login successful with role:', data.user.role);
        
        return {};
      }

      return { error: 'Unbekannter Fehler' };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      return { error: 'Verbindungsfehler' };
    }
  };

  const logout = () => {
    localStorage.removeItem('app-auth-data');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const getAuthToken = () => {
    const authData = localStorage.getItem('app-auth-data');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.session?.access_token || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser) {
      return { error: 'Nicht angemeldet' };
    }

    try {
      // First verify current password
      const loginResult = await supabase.functions.invoke('auth-login', {
        body: { 
          username: currentUser.username, 
          password: currentPassword, 
          type: 'admin' 
        }
      });

      if (loginResult.error || loginResult.data?.error) {
        return { error: 'Aktuelles Passwort ist falsch' };
      }

      // TODO: Implement password change edge function
      // For now, return success (placeholder)
      console.log('Password change requested for user:', currentUser.username);
      return { error: 'Passwort-Änderung noch nicht implementiert' };
    } catch (error) {
      console.error('AuthContext: Change password error:', error);
      return { error: 'Fehler beim Ändern des Passworts' };
    }
  };

  const value = {
    isAuthenticated,
    loading,
    login,
    logout,
    getAuthToken,
    changePassword,
    currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};