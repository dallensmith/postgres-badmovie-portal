import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, DashboardData } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const dashboardData = await apiService.getDashboardStats();
        setData(dashboardData);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardData = await apiService.getDashboardStats();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-xl text-primary-400">
          🎬 Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-center bg-dark-800 p-8 rounded-lg">
        <h2 className="text-xl mb-2">⚠️ Error Loading Dashboard</h2>
        <p className="mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold horror-text text-primary-500">
          Bad Movies Portal Dashboard
        </h1>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-sm text-gray-400">
              {error ? 'Disconnected' : 'Connected'}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-dark-700 hover:bg-dark-600 border border-dark-600 hover:border-primary-500 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-dark-800 p-6 rounded-lg shadow-md border border-dark-600 hover:border-primary-500 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Total Movies</h3>
            <span className="text-2xl">🎬</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">
            {data?.stats.totalMovies.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">Bad movies catalogued</p>
        </div>
        
        <div className="bg-dark-800 p-6 rounded-lg shadow-md border border-dark-600 hover:border-primary-500 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Experiments</h3>
            <span className="text-2xl">🧪</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">
            {data?.stats.totalExperiments.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">Viewing sessions</p>
        </div>
        
        <div className="bg-dark-800 p-6 rounded-lg shadow-md border border-dark-600 hover:border-primary-500 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">People</h3>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">
            {data?.stats.totalPeople.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">Actors & crew</p>
        </div>
        
        <div className="bg-dark-800 p-6 rounded-lg shadow-md border border-dark-600 hover:border-primary-500 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Avg Rating</h3>
            <span className="text-2xl">⭐</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">
            {data?.stats.averageRating}/10
          </p>
          <p className="text-sm text-gray-500 mt-1">TMDb average</p>
        </div>
      </div>

      {/* Data Export Section */}
      <div className="mb-8">
        <div className="bg-dark-800 p-6 rounded-lg shadow-md border border-dark-600 hover:border-primary-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-300 flex items-center">
                <span className="text-2xl mr-3">💾</span>
                Database Export
              </h3>
              <p className="text-gray-400 text-sm">
                Export your data for backup, analysis, or migration. Preview data before downloading.
              </p>
            </div>
            <button
              onClick={() => navigate('/export')}
              className="bg-primary-500 hover:bg-primary-600 px-6 py-3 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
            >
              <span>📊</span>
              <span>Export Data</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Recent Movies</h2>
          <div className="space-y-3">
            {data?.recentActivity.recentMovies.map((movie) => (
              <div key={movie.id} className="flex items-center space-x-3">
                <div className="w-12 h-16 bg-dark-600 rounded flex-shrink-0 overflow-hidden">
                  {movie.moviePoster ? (
                    <img 
                      src={movie.moviePoster} 
                      alt={movie.movieTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No Poster
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{movie.movieTitle}</h3>
                  <p className="text-sm text-gray-400">
                    {movie.movieYear} • Added {new Date(movie.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Recent Experiments</h2>
          <div className="space-y-4">
            {data?.recentActivity.recentExperiments.map((experiment) => (
              <div key={experiment.id} className="flex items-center space-x-4">
                <div className="w-24 h-16 bg-dark-600 rounded flex-shrink-0 overflow-hidden">
                  {experiment.eventImage ? (
                    <img 
                      src={experiment.eventImage} 
                      alt={`Experiment #${experiment.experimentNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex-1 border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold">Experiment #{experiment.experimentNumber}</h3>
                  <p className="text-sm text-gray-400">
                    {experiment.experimentMovies?.length > 0 
                      ? experiment.experimentMovies.slice(0, 3).join(', ')
                      : 'No movies assigned'
                    }
                    {experiment.experimentMovies?.length > 3 && ` +${experiment.experimentMovies.length - 3} more`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Event: {(() => {
                      const date = new Date(experiment.eventDate);
                      const year = date.getUTCFullYear();
                      const month = date.getUTCMonth() + 1;
                      const day = date.getUTCDate();
                      return `${month}/${day}/${year}`;
                    })()} • {experiment.experimentMovies?.length || 0} movie{experiment.experimentMovies?.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-dark-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Bad Movies Portal</h2>
        <p className="text-gray-300 mb-4">
          This comprehensive admin portal helps you manage "bad movie viewing experiments" - 
          community events where groups watch intentionally terrible movies together.
        </p>
        <p className="text-gray-300 mb-4">
          Featuring dual TMDb + OMDb API integration, advanced search capabilities, and a modern 
          React interface, this portal provides complete management of your movie database, 
          experiment tracking, and community event organization.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-2">🛠️ Tech Stack</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li><strong>Frontend:</strong> React + TypeScript + Vite</li>
              <li><strong>Backend:</strong> Node.js + Express</li>
              <li><strong>Database:</strong> PostgreSQL + Prisma ORM</li>
              <li><strong>APIs:</strong> TMDb + OMDb integration</li>
              <li><strong>Styling:</strong> Tailwind CSS</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-primary-400 mb-2">🚀 System Status</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li><strong>Performance:</strong> Sub-1-second load times</li>
              <li><strong>Data:</strong> 950+ movies, 500+ experiments</li>
              <li><strong>Enrichment:</strong> 97.7% OMDb success rate</li>
              <li><strong>Backup:</strong> Full export/import capabilities</li>
              <li><strong>Status:</strong> Production-ready</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-primary-400 mb-2">🎯 Future Vision</h3>
          <p className="text-sm text-gray-300">
            <strong>Next Phase:</strong> Public frontend launch leveraging this proven admin architecture. 
            Building a unified React ecosystem for the bad movie community with public browsing, 
            search capabilities, experiment calendar, and community features - all powered by 
            the same high-performance backend that delivers exceptional admin experience.
          </p>
        </div>
      </div>
    </div>
  );
}
