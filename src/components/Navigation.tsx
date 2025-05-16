
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="flex justify-center mb-8 gap-2">
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
    </nav>
  );
};

export default Navigation;
