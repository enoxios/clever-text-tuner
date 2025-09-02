import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user is admin
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (adminData) {
            setIsAdmin(true);
            setUserInfo(adminData);
          } else {
            // Check if regular user
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            
            setIsAdmin(false);
            setUserInfo(userData);
          }
        } else {
          setIsAdmin(false);
          setUserInfo(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { username, password, type: 'user' }
      });

      if (error) throw error;
      if (data.error) return { error: data.error };

      return {};
    } catch (error: any) {
      return { error: error.message || 'Login fehlgeschlagen' };
    }
  };

  const adminLogin = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { username, password, type: 'admin' }
      });

      if (error) throw error;
      if (data.error) return { error: data.error };

      return {};
    } catch (error: any) {
      return { error: error.message || 'Admin Login fehlgeschlagen' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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