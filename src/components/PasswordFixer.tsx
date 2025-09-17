import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const PasswordFixer = () => {
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const fixPassword = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-admin-password', {
        body: { password }
      });

      if (error) {
        console.error('Function error:', error);
        toast.error('Fehler beim Passwort-Update: ' + error.message);
        return;
      }

      if (data?.success) {
        toast.success('Admin-Passwort erfolgreich auf "' + password + '" gesetzt!');
        console.log('New hash:', data.newHash);
      } else {
        toast.error('Passwort-Update fehlgeschlagen');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Admin-Passwort Fix</h3>
      <div className="flex gap-2">
        <Input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Neues Passwort"
        />
        <Button 
          onClick={fixPassword} 
          disabled={loading || !password}
        >
          {loading ? 'Wird gesetzt...' : 'Passwort setzen'}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Dies generiert einen neuen bcrypt-Hash mit der gleichen Deno-Bibliothek die auch für die Verifikation verwendet wird.
      </p>
    </div>
  );
};