import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import { Lock, User, Shield } from 'lucide-react';

const AdminSettings = () => {
  const { changePassword, currentUser, logout } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Neue Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setLoading(true);
    
    const result = await changePassword(currentPassword, newPassword);
    
    if (result.error) {
      setError(result.error);
    } else {
      toast({
        title: 'Passwort geändert',
        description: 'Ihr Passwort wurde erfolgreich geändert.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: 'Abgemeldet',
      description: 'Sie wurden erfolgreich abgemeldet.',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Shield className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Admin-Einstellungen</h1>
            </div>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Administrator-Kontoeinstellungen
            </p>
          </div>

          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Konto-Informationen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Benutzername:</span>
                  <span className="text-sm text-muted-foreground">
                    {currentUser?.username || 'Unbekannt'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rolle:</span>
                  <span className="text-sm text-muted-foreground">Administrator</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Passwort ändern
              </CardTitle>
              <CardDescription>
                Ändern Sie Ihr Administrator-Passwort für mehr Sicherheit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Neues Passwort</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-sm text-muted-foreground">
                    Mindestens 8 Zeichen
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Wird geändert...' : 'Passwort ändern'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Gefahrenbereich</CardTitle>
              <CardDescription>
                Aktionen mit dauerhaften Auswirkungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                className="w-full"
              >
                Abmelden
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;