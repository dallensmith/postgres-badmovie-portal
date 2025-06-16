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
          <div className="space-y-3">
            {data?.recentActivity.recentExperiments.map((experiment) => (
              <div key={experiment.id} className="border-l-4 border-primary-500 pl-4">
                <h3 className="font-semibold">Experiment #{experiment.experimentNumber}</h3>
                <p className="text-sm text-gray-400">
                  {experiment.experimentMovies?.length > 0 
                    ? experiment.experimentMovies.slice(0, 3).join(', ')
                    : 'No movies assigned'
                  }
                  {experiment.experimentMovies?.length > 3 && ` +${experiment.experimentMovies.length - 3} more`}
                </p>
                <p className="text-xs text-gray-500">
                  Event: {new Date(experiment.eventDate).toLocaleDateString()} • {experiment.experimentMovies?.length || 0} movie{experiment.experimentMovies?.length !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-dark-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Bad Movies Portal</h2>
        <p className="text-gray-300 mb-4">
          This PostgreSQL-first admin portal helps you manage "bad movie viewing experiments" - 
          community events where groups watch intentionally terrible movies together.
        </p>
        <p className="text-gray-300">
          Use this portal to manage your movie database, organize experiments, and maintain 
          data integrity between WordPress/Pods and your PostgreSQL database.
        </p>
      </div>
    </div>
  );
}
