import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
  must_change_password: boolean;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Authentication removed - always fetch users
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Fehler',
        description: 'Benutzer konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { username: newUsername, password: newPassword }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Erfolg',
        description: 'Benutzer wurde erfolgreich erstellt',
      });

      setNewUsername('');
      setNewPassword('');
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Benutzer konnte nicht erstellt werden',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Erfolg',
        description: `Benutzer wurde ${!currentStatus ? 'aktiviert' : 'deaktiviert'}`,
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht geändert werden',
        variant: 'destructive',
      });
    }
  };

  const resetPassword = async (userId: string, username: string) => {
    const newTempPassword = `temp_${Math.random().toString(36).slice(-8)}`;
    
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { userId, newPassword: newTempPassword }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Passwort zurückgesetzt',
        description: `Neues temporäres Passwort für ${username}: ${newTempPassword}`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Passwort konnte nicht zurückgesetzt werden',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gnb-primary mb-2">
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Benutzerverwaltung für GNB KI Korrektorat
          </p>
        </div>

        {/* Create User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Neuen Benutzer erstellen
            </CardTitle>
            <CardDescription>
              Erstellen Sie ein neues Benutzerkonto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createUser} className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="newUsername">Benutzername</Label>
                <Input
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="newPassword">Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isCreating}
                />
              </div>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Erstellen...
                  </>
                ) : (
                  'Erstellen'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Benutzer ({users.length})</CardTitle>
              <Button variant="outline" onClick={fetchUsers} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Keine Benutzer gefunden. Erstellen Sie den ersten Benutzer.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead>Passwort ändern</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.must_change_password ? 'destructive' : 'outline'}>
                          {user.must_change_password ? 'Erforderlich' : 'Optional'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                          >
                            {user.is_active ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetPassword(user.id, user.username)}
                          >
                            Passwort zurücksetzen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;