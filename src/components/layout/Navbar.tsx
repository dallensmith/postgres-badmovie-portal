import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-dark-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold cinema-text text-primary-500">
            BAD MOVIES PORTAL
          </Link>
          
          <div className="flex space-x-6">
            <Link 
              to="/" 
              className="text-white hover:text-primary-400 transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              to="/movies" 
              className="text-white hover:text-primary-400 transition-colors"
            >
              Movies
            </Link>
            <Link 
              to="/experiments" 
              className="text-white hover:text-primary-400 transition-colors"
            >
              Experiments
            </Link>
            <Link 
              to="/people" 
              className="text-white hover:text-primary-400 transition-colors"
            >
              People
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
