import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userInfo: any | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer additional data fetching to avoid deadlocks
          setTimeout(() => {
            checkAdminStatus(session.user.id);
          }, 0);
        } else {
          setUserInfo(null);
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          checkAdminStatus(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, username')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setIsAdmin(true);
        setUserInfo({ username: data.username, isAdmin: true });
      } else {
        // Check regular users table
        const { data: userData } = await supabase
          .from('users')
          .select('id, username, role')
          .eq('id', userId)
          .single();

        if (userData) {
          setIsAdmin(userData.role === 'admin');
          setUserInfo({ username: userData.username, role: userData.role });
        } else {
          setIsAdmin(false);
          setUserInfo({ email: user?.email });
        }
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
      setUserInfo({ email: user?.email });
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err) {
      return { error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err) {
      return { error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  };

  const adminLogin = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: {
          username,
          password,
          type: 'admin'
        }
      });

      if (error) {
        return { error: error.message };
      }

      if (data.error) {
        return { error: data.error };
      }

      return {};
    } catch (err) {
      return { error: 'Ein unerwarteter Fehler ist aufgetreten' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  const value = {
    user,
    session,
    userInfo,
    isAdmin,
    loading,
    login,
    signUp,
    adminLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};