import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Languages, Shield, User } from 'lucide-react';

const Index = () => {
  const { user, isAdmin } = useAuth();

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gnb-primary mb-2">
              GNB KI Korrektorat
            </CardTitle>
            <p className="text-muted-foreground">
              Willkommen zurück! Wählen Sie einen Bereich aus:
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/lektorat">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <BookOpen className="h-6 w-6" />
                  <span>Lektorat</span>
                </Button>
              </Link>
              <Link to="/uebersetzung">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Languages className="h-6 w-6" />
                  <span>Übersetzung</span>
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="md:col-span-2">
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Shield className="h-6 w-6" />
                    <span>Admin Panel</span>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-gnb-primary mb-4">
            GNB KI Korrektorat
          </CardTitle>
          <p className="text-xl text-muted-foreground mb-6">
            Professionelle KI-gestützte Textbearbeitung und Übersetzung
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gnb-primary" />
              <h3 className="font-semibold text-lg mb-2">Lektorat</h3>
              <p className="text-sm text-muted-foreground">
                Professionelle Textkorrektur und Lektorat mit KI-Unterstützung
              </p>
            </div>
            <div className="text-center p-4">
              <Languages className="h-12 w-12 mx-auto mb-3 text-gnb-primary" />
              <h3 className="font-semibold text-lg mb-2">Übersetzung</h3>
              <p className="text-sm text-muted-foreground">
                Hochwertige Übersetzungen in verschiedene Sprachen
              </p>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto">
                <User className="mr-2 h-5 w-5" />
                Anmelden
              </Button>
            </Link>
            
            <div className="flex justify-center gap-4 pt-4">
              <Link to="/admin-login">
                <Button variant="ghost" size="sm" className="text-xs">
                  <Shield className="mr-1 h-3 w-3" />
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
