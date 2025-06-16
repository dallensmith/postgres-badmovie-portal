import { useState, useEffect } from 'react';
import { MovieFormData } from './MovieFormModal';

export interface TMDbMovie {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  year?: string;
  releaseDate?: string;
  overview?: string;
  poster?: string;
  backdrop?: string;
  rating?: number;
  voteCount?: number;
  popularity?: number;
  adult?: boolean;
  originalLanguage?: string;
}

export interface TMDbMovieDetail extends TMDbMovie {
  runtime?: number;
  tagline?: string;
  budget?: string;
  boxOffice?: string;
  status?: string;
  tmdbUrl?: string;
  imdbId?: string;
  imdbUrl?: string;
  genres?: string[];
  productionCompanies?: string[];
  productionCountries?: string[];
  spokenLanguages?: string[];
  cast?: string[];
  directors?: string[];
  writers?: string[];
  trailer?: string;
}

export interface TMDbSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (movieData: MovieFormData) => Promise<void>;
}

export const TMDbSearchModal: React.FC<TMDbSearchModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDbMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setCurrentPage(1);
      setTotalPages(0);
      setError(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery, 1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async (query: string, page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tmdb/search/movie?query=${encodeURIComponent(query)}&page=${page}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSearchResults(data.results);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search movies');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (tmdbMovie: TMDbMovie) => {
    setImporting(tmdbMovie.tmdbId);
    setError(null);

    try {
      // First get detailed movie information
      const response = await fetch(`/api/tmdb/movie/${tmdbMovie.tmdbId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch movie details: ${response.statusText}`);
      }

      const detailedMovie: TMDbMovieDetail = await response.json();

      // Transform TMDb data to our movie form format
      const movieData: MovieFormData = {
        movieTitle: detailedMovie.title,
        movieOriginalTitle: detailedMovie.originalTitle || '',
        movieYear: detailedMovie.year || '',
        movieReleaseDate: detailedMovie.releaseDate || '',
        movieRuntime: detailedMovie.runtime || undefined,
        movieTagline: detailedMovie.tagline || '',
        movieOverview: detailedMovie.overview || '',
        movieContentRating: '', // TMDb doesn't provide this, user can fill manually
        movieBudget: detailedMovie.budget || '',
        movieBoxOffice: detailedMovie.boxOffice || '',
        moviePoster: detailedMovie.poster || '',
        movieBackdrop: detailedMovie.backdrop || '',
        movieTrailer: detailedMovie.trailer || '',
        movieTmdbId: detailedMovie.tmdbId.toString(),
        movieTmdbUrl: detailedMovie.tmdbUrl || '',
        movieTmdbRating: detailedMovie.rating?.toString() || '',
        movieTmdbVotes: detailedMovie.voteCount?.toString() || '',
        movieImdbId: detailedMovie.imdbId || '',
        movieImdbUrl: detailedMovie.imdbUrl || '',
        movieActors: detailedMovie.cast || [],
        movieDirectors: detailedMovie.directors || [],
        movieWriters: detailedMovie.writers || [],
        movieGenres: detailedMovie.genres || [],
        movieCountries: detailedMovie.productionCountries || [],
        movieLanguages: detailedMovie.spokenLanguages || [],
        movieStudios: detailedMovie.productionCompanies || [],
        movieAmazonLink: '' // User can add manually
      };

      await onImport(movieData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import movie');
    } finally {
      setImporting(null);
    }
  };

  const handlePageChange = (page: number) => {
    if (searchQuery.trim()) {
      performSearch(searchQuery, page);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-dark-600">
          <h2 className="text-2xl font-bold text-white">Import from TMDb</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl p-2"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-dark-600">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for movies on TMDb..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              ) : (
                <span className="text-gray-400">🔍</span>
              )}
            </div>
          </div>
          
          {searchQuery && !loading && (
            <p className="text-gray-400 text-sm mt-2">
              Found {searchResults.length} results
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900 border-b border-red-700 text-red-100">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          {!searchQuery.trim() && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold mb-2">Search TMDb Movies</h3>
              <p className="text-center max-w-md">
                Enter a movie title above to search The Movie Database and import movies with complete metadata.
              </p>
            </div>
          )}

          {searchQuery.trim() && !loading && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-6xl mb-4">😕</div>
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-center max-w-md">
                No movies found for "{searchQuery}". Try a different search term or check the spelling.
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((movie) => (
                  <div key={movie.tmdbId} className="bg-dark-700 rounded-lg overflow-hidden shadow-md">
                    {/* Movie Poster */}
                    <div className="aspect-[2/3] bg-dark-600 relative">
                      {movie.poster ? (
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                      {movie.rating && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded text-sm font-semibold">
                          ★ {movie.rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div className="p-4">
                      <h3 className="text-white font-semibold mb-1 line-clamp-2">
                        {movie.title}
                      </h3>
                      
                      {movie.originalTitle && movie.originalTitle !== movie.title && (
                        <p className="text-gray-400 text-sm mb-2 italic line-clamp-1">
                          {movie.originalTitle}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                        <span>{movie.year || 'Unknown Year'}</span>
                        {movie.originalLanguage && (
                          <span className="uppercase">{movie.originalLanguage}</span>
                        )}
                      </div>

                      {movie.overview && (
                        <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                          {movie.overview}
                        </p>
                      )}

                      {/* Import Button */}
                      <button
                        onClick={() => handleImport(movie)}
                        disabled={importing === movie.tmdbId}
                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded transition-colors"
                      >
                        {importing === movie.tmdbId ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Importing...
                          </span>
                        ) : (
                          'Import Movie'
                        )}
                      </button>

                      {/* TMDb Link */}
                      <a
                        href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-primary-400 hover:text-primary-300 text-sm mt-2 transition-colors"
                      >
                        View on TMDb
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="bg-dark-600 hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                  >
                    Previous
                  </button>
                  
                  <span className="text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="bg-dark-600 hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
