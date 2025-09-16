import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ApiKeys {
  openai_api_key: string | null;
  claude_api_key: string | null;
}

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openai_api_key: null, claude_api_key: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, getAuthToken } = useAuth();

  // Load API keys from Supabase or fallback to localStorage
  const loadApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAuthenticated && getAuthToken()) {
        // Try to load from Supabase
        const { data, error } = await supabase.functions.invoke('manage-api-keys', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });

        if (error) {
          console.error('Failed to load API keys from Supabase:', error);
          // Fallback to localStorage
          loadFromLocalStorage();
        } else {
          setApiKeys(data);
          // Migrate from localStorage to Supabase if keys exist locally but not in DB
          if (!data.openai_api_key && !data.claude_api_key) {
            const localOpenAI = localStorage.getItem('openai-api-key');
            const localClaude = localStorage.getItem('claude-api-key');
            if (localOpenAI || localClaude) {
              await saveApiKeys(localOpenAI || '', localClaude || '');
            }
          }
        }
      } else {
        // No session, use localStorage
        loadFromLocalStorage();
      }
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError('Failed to load API keys');
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const openaiKey = localStorage.getItem('openai-api-key') || '';
    const claudeKey = localStorage.getItem('claude-api-key') || '';
    setApiKeys({ openai_api_key: openaiKey, claude_api_key: claudeKey });
  };

  // Save API keys to Supabase and localStorage
  const saveApiKeys = async (openaiKey: string, claudeKey: string) => {
    try {
      setError(null);

      // Always save to localStorage as backup
      if (openaiKey) {
        localStorage.setItem('openai-api-key', openaiKey);
      } else {
        localStorage.removeItem('openai-api-key');
      }
      
      if (claudeKey) {
        localStorage.setItem('claude-api-key', claudeKey);
      } else {
        localStorage.removeItem('claude-api-key');
      }

      // Save to Supabase if authenticated
      if (isAuthenticated && getAuthToken()) {
        const { error } = await supabase.functions.invoke('manage-api-keys', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: {
            openai_api_key: openaiKey || null,
            claude_api_key: claudeKey || null,
          },
        });

        if (error) {
          console.error('Failed to save API keys to Supabase:', error);
          setError('Failed to save API keys to cloud storage');
        }
      }

      setApiKeys({ openai_api_key: openaiKey, claude_api_key: claudeKey });
      return true;
    } catch (err) {
      console.error('Error saving API keys:', err);
      setError('Failed to save API keys');
      return false;
    }
  };

  // Delete API keys
  const deleteApiKeys = async () => {
    try {
      setError(null);

      // Remove from localStorage
      localStorage.removeItem('openai-api-key');
      localStorage.removeItem('claude-api-key');

      // Remove from Supabase if authenticated
      if (isAuthenticated && getAuthToken()) {
        const { error } = await supabase.functions.invoke('manage-api-keys', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });

        if (error) {
          console.error('Failed to delete API keys from Supabase:', error);
          setError('Failed to delete API keys from cloud storage');
        }
      }

      setApiKeys({ openai_api_key: null, claude_api_key: null });
      return true;
    } catch (err) {
      console.error('Error deleting API keys:', err);
      setError('Failed to delete API keys');
      return false;
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, [isAuthenticated]);

  return {
    apiKeys,
    loading,
    error,
    saveApiKeys,
    deleteApiKeys,
    refreshApiKeys: loadApiKeys,
  };
};