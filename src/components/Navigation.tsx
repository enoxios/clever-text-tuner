
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const path = location.pathname;
  const { userInfo, isAdmin, logout } = useAuth();

  return (
    <nav className="flex justify-between items-center mb-8">
      <div className="flex gap-2">
        <Link 
          to="/lektorat"
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            path === '/' || path === '/lektorat' 
              ? 'bg-gnb-primary text-white' 
              : 'text-gnb-primary hover:bg-gnb-primary/10'
          }`}
        >
          Lektorat
        </Link>
        
        <Link 
          to="/uebersetzung"
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            path === '/uebersetzung' 
              ? 'bg-gnb-primary text-white' 
              : 'text-gnb-primary hover:bg-gnb-primary/10'
          }`}
        >
          Übersetzung
        </Link>
      </div>
      
      <div className="flex items-center gap-3">
        {userInfo && (
          <span className="text-sm text-muted-foreground">
            {userInfo.username} {isAdmin && '(Admin)'}
          </span>
        )}
        
        {isAdmin && (
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Admin Panel
            </Button>
          </Link>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={logout}
          className="text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;
