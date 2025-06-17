import { useState, useEffect, useCallback } from 'react';
import { MovieCard, Movie } from '../components/MovieCard';
import { SearchFilters } from '../components/SearchFilters';
import { Pagination } from '../components/Pagination';
import { MovieGridSkeleton } from '../components/LoadingStates';
import { MovieDetailModal } from '../components/MovieDetailModal';
import { MovieFormModal, MovieFormData } from '../components/MovieFormModal';
import { TMDbSearchModal } from '../components/TMDbSearchModal';

interface MoviesResponse {
  movies: Movie[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface MovieStats {
  totalMovies: number;
  moviesByYear: { year: string; count: number }[];
  averageRating: number;
}

export default function Movies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Available years for filtering
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [stats, setStats] = useState<MovieStats | null>(null);

  // Modal states
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    movie: Movie | null;
  }>({ isOpen: false, movie: null });
  
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    movie: Movie | null;
  }>({ isOpen: false, movie: null });

  const [tmdbModal, setTmdbModal] = useState(false);
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [batchOmdbSyncing, setBatchOmdbSyncing] = useState(false);
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);

  // Fetch movies with current filters
  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedYear) params.append('year', selectedYear);

      const response = await fetch(`/api/movies?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MoviesResponse = await response.json();
      setMovies(data.movies);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch movies');
      console.error('Error fetching movies:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, selectedYear, sortBy, sortOrder]);

  // Fetch available years for filtering
  const fetchYears = useCallback(async () => {
    try {
      const response = await fetch('/api/movies/years');
      if (response.ok) {
        const years = await response.json();
        setAvailableYears(years);
      }
    } catch (err) {
      console.error('Error fetching years:', err);
    }
  }, []);

  // Fetch movie statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/movies/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchYears();
    fetchStats();
  }, [fetchYears, fetchStats]);

  // Fetch movies when filters change
  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchMovies();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Event handlers
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedYear('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  const handleMovieView = (movie: Movie) => {
    setDetailModal({ isOpen: true, movie });
  };

  const handleMovieEdit = async (movie: Movie) => {
    try {
      // Show loading state while fetching complete data
      setFormModal({ isOpen: false, movie: null });
      
      // Fetch the complete movie data before editing
      const response = await fetch(`/api/movies/${movie.id}`);
      if (response.ok) {
        const fullMovie = await response.json();
        console.log('Full movie data fetched for edit:', fullMovie);
        
        // Only open modal after we have complete data
        setFormModal({ isOpen: true, movie: fullMovie });
      } else {
        throw new Error('Failed to fetch movie details');
      }
    } catch (error) {
      console.error('Error fetching movie for edit:', error);
      // Fallback to using the partial data
      setFormModal({ isOpen: true, movie });
    }
  };

  const handleMovieAdd = () => {
    setFormModal({ isOpen: true, movie: null });
  };

  const handleTmdbImport = () => {
    setTmdbModal(true);
  };

  const handleTmdbMovieSelect = (tmdbId: number) => {
    // Close TMDb modal and open movie form with TMDb ID pre-filled
    setTmdbModal(false);
    setFormModal({ isOpen: true, movie: null });
    
    // We need to pre-fill the TMDb ID and trigger sync
    // This will be handled by passing the tmdbId to the form modal
    setSelectedTmdbId(tmdbId);
  };

  const handleBatchTmdbSync = async () => {
    if (!window.confirm(
      'This will update ALL movies in your database with fresh data from TMDb. ' +
      'This process may take several minutes. Continue?'
    )) {
      return;
    }

    setBatchSyncing(true);
    try {
      const response = await fetch('/api/movies/batch-sync-tmdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start batch sync');
      }

      const result = await response.json();
      
      // Show detailed results
      const failedCount = result.failed || 0;
      const updatedCount = result.updated || 0;
      const totalCount = result.total || 0;

      let message = `Batch sync completed!\n\n`;
      message += `Total movies processed: ${totalCount}\n`;
      message += `Successfully updated: ${updatedCount}\n`;
      message += `Failed: ${failedCount}`;

      if (failedCount > 0 && result.results) {
        const failedMovies = result.results
          .filter((r: any) => r.status === 'error')
          .slice(0, 5)
          .map((r: any) => `• ${r.title}: ${r.message}`)
          .join('\n');
        
        if (failedMovies) {
          message += `\n\nFirst few failures:\n${failedMovies}`;
          if (failedCount > 5) {
            message += `\n... and ${failedCount - 5} more`;
          }
        }
      }

      alert(message);

      // Refresh the movie list to show updated data
      fetchMovies();
      fetchStats();

    } catch (error) {
      console.error('Batch sync error:', error);
      alert('Failed to perform batch sync: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setBatchSyncing(false);
    }
  };

  const handleBatchOmdbSync = async () => {
    if (!window.confirm(
      'This will fill in missing data for ALL movies using OMDb (ratings, awards, etc.). ' +
      'Only empty fields will be updated. This process may take several minutes. Continue?'
    )) {
      return;
    }

    setBatchOmdbSyncing(true);
    try {
      const response = await fetch('/api/movies/batch-omdb-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start batch OMDb sync');
      }

      const result = await response.json();
      
      // Show detailed results
      const failedCount = result.failed || 0;
      const updatedCount = result.updated || 0;
      const skippedCount = result.skipped || 0;
      const totalCount = result.total || 0;

      let message = `Batch OMDb sync completed!\n\n`;
      message += `Total movies processed: ${totalCount}\n`;
      message += `Successfully updated: ${updatedCount}\n`;
      message += `Skipped (no IMDb ID): ${skippedCount}\n`;
      message += `Failed: ${failedCount}`;

      if (failedCount > 0 && result.results) {
        const failedMovies = result.results
          .filter((r: any) => r.status === 'error')
          .slice(0, 5)
          .map((r: any) => `• ${r.title}: ${r.message}`)
          .join('\n');
        
        if (failedMovies) {
          message += `\n\nFirst few failures:\n${failedMovies}`;
          if (failedCount > 5) {
            message += `\n... and ${failedCount - 5} more`;
          }
        }
      }

      alert(message);

      // Refresh the movie list to show updated data
      fetchMovies();
      fetchStats();

    } catch (error) {
      console.error('Batch OMDb sync error:', error);
      alert('Failed to perform batch OMDb sync: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setBatchOmdbSyncing(false);
    }
  };

  const handleMovieDelete = async (movieId: number) => {
    if (!window.confirm('Are you sure you want to delete this movie?')) {
      return;
    }

    try {
      const response = await fetch(`/api/movies/${movieId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh the movie list
        fetchMovies();
        // Also refresh stats
        fetchStats();
        // Close modals if this movie was open
        if (detailModal.movie?.id === movieId) {
          setDetailModal({ isOpen: false, movie: null });
        }
      } else {
        throw new Error('Failed to delete movie');
      }
    } catch (err) {
      alert('Failed to delete movie: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleMovieSave = async (data: MovieFormData) => {
    const isEdit = formModal.movie !== null;
    const url = isEdit ? `/api/movies/${formModal.movie!.id}` : '/api/movies';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Server error:', errorData);
      throw new Error(`Failed to ${isEdit ? 'update' : 'create'} movie: ${errorData}`);
    }

    // Refresh the movie list and stats
    fetchMovies();
    fetchStats();
    
    // Close the form modal
    setFormModal({ isOpen: false, movie: null });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Movie Management</h1>
          <p className="text-gray-300">
            Browse, search, and manage your bad movie collection
          </p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleMovieAdd}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add New Movie
          </button>
          <button 
            onClick={handleTmdbImport}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Import from TMDb
          </button>
          <button 
            onClick={handleBatchTmdbSync}
            disabled={batchSyncing || batchOmdbSyncing || loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {batchSyncing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Syncing...
              </>
            ) : (
              'Sync All with TMDb'
            )}
          </button>
          <button 
            onClick={handleBatchOmdbSync}
            disabled={batchSyncing || batchOmdbSyncing || loading}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {batchOmdbSyncing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Filling...
              </>
            ) : (
              <>
                🍅 Fill Missing with OMDb
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Total Movies</h3>
            <p className="text-3xl font-bold text-primary-400">{stats.totalMovies.toLocaleString()}</p>
          </div>
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Average Rating</h3>
            <p className="text-3xl font-bold text-yellow-400">★ {stats.averageRating}</p>
          </div>
          <div className="bg-dark-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Most Recent Year</h3>
            <p className="text-3xl font-bold text-green-400">
              {stats.moviesByYear[0]?.year || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <SearchFilters
        searchQuery={searchQuery}
        selectedYear={selectedYear}
        sortBy={sortBy}
        sortOrder={sortOrder}
        availableYears={availableYears}
        onSearchChange={handleSearchChange}
        onYearChange={handleYearChange}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
        totalResults={pagination.total}
      />

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
          <h3 className="font-semibold mb-1">Error loading movies</h3>
          <p>{error}</p>
          <button
            onClick={fetchMovies}
            className="mt-2 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <MovieGridSkeleton count={pagination.limit} />
      )}

      {/* Movies Grid */}
      {!loading && !error && movies.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {movies.map(movie => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onView={handleMovieView}
                onEdit={handleMovieEdit}
                onDelete={handleMovieDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      )}

      {/* Empty State */}
      {!loading && !error && movies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-2xl font-semibold text-white mb-2">No movies found</h3>
          <p className="text-gray-300 mb-6">
            {searchQuery || selectedYear 
              ? 'Try adjusting your search filters or clearing them to see all movies.'
              : 'Get started by adding your first movie to the collection.'
            }
          </p>
          <div className="flex justify-center gap-4">
            {(searchQuery || selectedYear) && (
              <button
                onClick={handleClearFilters}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
            <button 
              onClick={handleMovieAdd}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add First Movie
            </button>
          </div>
        </div>
      )}

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movie={detailModal.movie}
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, movie: null })}
        onEdit={(movie) => {
          setDetailModal({ isOpen: false, movie: null });
          setFormModal({ isOpen: true, movie });
        }}
        onDelete={handleMovieDelete}
      />

      {/* Movie Form Modal */}
      <MovieFormModal
        key={formModal.movie?.id || 'new'}
        movie={formModal.movie}
        isOpen={formModal.isOpen}
        onClose={() => {
          setFormModal({ isOpen: false, movie: null });
          setSelectedTmdbId(null); // Clear selected TMDb ID when closing
        }}
        onSave={handleMovieSave}
        tmdbId={selectedTmdbId}
      />

      {/* TMDb Search Modal */}
      <TMDbSearchModal
        isOpen={tmdbModal}
        onClose={() => setTmdbModal(false)}
        onSelectMovie={handleTmdbMovieSelect}
      />
    </div>
  );
}
