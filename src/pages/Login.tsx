import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/lektorat');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = isSignUp ? await signUp(email, password) : await login(email, password);
      if (result.error) {
        setError(result.error);
      } else if (isSignUp) {
        setError('');
        setIsSignUp(false);
        // Show success message for sign up
        alert('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Registrierung' : 'Anmeldung'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Erstellen Sie ein neues Konto für den Zugang zur Plattform'
              : 'Melden Sie sich mit Ihren Anmeldedaten an'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre.email@beispiel.de"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Mindestens 6 Zeichen' : 'Ihr Passwort'}
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registrieren
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Anmelden
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              disabled={isLoading}
              className="text-sm"
            >
              {isSignUp 
                ? 'Bereits ein Konto? Hier anmelden' 
                : 'Noch kein Konto? Hier registrieren'
              }
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Link 
              to="/admin-login" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin-Anmeldung
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;