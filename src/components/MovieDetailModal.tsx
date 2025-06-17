import { useState, useEffect } from 'react';
import { Movie, MovieExperiment } from './MovieCard';

// Utility function to format currency values
const formatCurrency = (value: string | null): string => {
  if (!value) return '';
  
  // Remove any existing currency symbols and non-numeric characters except periods
  const cleanValue = value.toString().replace(/[^0-9.]/g, '');
  
  // Parse as number
  const numericValue = parseFloat(cleanValue);
  
  // Return formatted currency if valid number, otherwise return original value
  if (!isNaN(numericValue) && numericValue > 0) {
    return `$${numericValue.toLocaleString()}`;
  }
  
  // If it's not a pure number, return the original value (might already be formatted)
  return value;
};

export interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (movie: Movie) => void;
  onDelete: (movieId: number) => void;
  onRefresh?: () => void; // For refreshing the movie list after sync
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [fullMovie, setFullMovie] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  // Fetch full movie details when modal opens
  useEffect(() => {
    if (isOpen && movie) {
      fetchFullMovieDetails(movie.id);
    }
  }, [isOpen, movie]);

  const fetchFullMovieDetails = async (movieId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/movies/${movieId}`);
      if (response.ok) {
        const data = await response.json();
        setFullMovie(data);
      }
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!movie) return;
    
    if (window.confirm('Are you sure you want to delete this movie? This action cannot be undone.')) {
      onDelete(movie.id);
      onClose();
    }
  };

  const handleSyncWithTMDb = async () => {
    if (!movie || !fullMovie?.movieTmdbId) {
      alert('No TMDb ID found for this movie. Cannot sync.');
      return;
    }

    if (fullMovie?.excludeFromTmdbSync) {
      alert('This movie is excluded from TMDb syncing. Edit the movie to change this setting.');
      return;
    }

    setSyncing(true);
    try {
      // Get fresh data from TMDb
      const tmdbResponse = await fetch(`/api/tmdb/movie/${fullMovie.movieTmdbId}`);
      if (!tmdbResponse.ok) {
        throw new Error('Failed to fetch data from TMDb');
      }

      const tmdbData = await tmdbResponse.json();

      // Transform TMDb data to our movie format
      const updateData = {
        movieTitle: tmdbData.title,
        movieOriginalTitle: tmdbData.originalTitle || '',
        movieYear: tmdbData.year || '',
        movieReleaseDate: tmdbData.releaseDate ? new Date(tmdbData.releaseDate) : null,
        movieRuntime: tmdbData.runtime || null,
        movieTagline: tmdbData.tagline || '',
        movieOverview: tmdbData.overview || '',
        movieBudget: tmdbData.budget || '',
        movieBoxOffice: tmdbData.boxOffice || '',
        moviePoster: tmdbData.poster || '',
        movieBackdrop: tmdbData.backdrop || '',
        movieTrailer: tmdbData.trailer || '',
        movieTmdbUrl: tmdbData.tmdbUrl || '',
        movieTmdbRating: tmdbData.rating?.toString() || '',
        movieTmdbVotes: tmdbData.voteCount?.toString() || '',
        movieImdbId: tmdbData.imdbId || '',
        movieImdbUrl: tmdbData.imdbUrl || '',
        movieActors: tmdbData.cast || [],
        movieDirectors: tmdbData.directors || [],
        movieWriters: tmdbData.writers || [],
        movieGenres: tmdbData.genres || [],
        movieCountries: tmdbData.productionCountries || [],
        movieLanguages: tmdbData.spokenLanguages || [],
        movieStudios: tmdbData.productionCompanies || [],
        lastTmdbFetch: new Date().toISOString()
      };

      // Update the movie in our database
      const updateResponse = await fetch(`/api/movies/${movie.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update movie in database');
      }

      // Refresh the full movie data
      await fetchFullMovieDetails(movie.id);
      
      // Refresh the movie list if callback provided
      if (onRefresh) {
        onRefresh();
      }

      // Show success message in console instead of alert for better UX
      console.log('Movie successfully synced with TMDb!');
    } catch (error) {
      console.error('Sync error:', error);
      // Could be improved to show toast notification instead of alert
      alert('Failed to sync with TMDb: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen || !movie) return null;

  const displayMovie = fullMovie || movie;
  const posterUrl = displayMovie.moviePoster || '/placeholder-movie.svg';
  const rating = displayMovie.movieTmdbRating ? parseFloat(displayMovie.movieTmdbRating).toFixed(1) : 'N/A';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Backdrop Hero Section */}
        {displayMovie.movieBackdrop && (
          <div className="relative h-48 bg-dark-700 rounded-t-lg overflow-hidden">
            <img
              src={displayMovie.movieBackdrop}
              alt={`${displayMovie.movieTitle} backdrop`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-800 via-dark-800/60 to-transparent"></div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl p-2 bg-black/50 rounded-full"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header */}
        <div className={`flex justify-between items-start p-6 ${!displayMovie.movieBackdrop ? 'border-b border-dark-600' : ''}`}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">
                {displayMovie.movieTitle || 'Untitled Movie'}
              </h2>
              {displayMovie.movieContentRating && (
                <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm font-semibold">
                  {displayMovie.movieContentRating}
                </span>
              )}
              {displayMovie.movieTmdbRating && (
                <span className="bg-yellow-500 text-black px-2 py-1 rounded text-sm font-semibold">
                  ★ {parseFloat(displayMovie.movieTmdbRating).toFixed(1)}
                </span>
              )}
            </div>
            {displayMovie.movieOriginalTitle && displayMovie.movieOriginalTitle !== displayMovie.movieTitle && (
              <p className="text-gray-400 italic">
                Original: {displayMovie.movieOriginalTitle}
              </p>
            )}
            {displayMovie.movieTagline && (
              <p className="text-primary-400 italic mt-2">
                "{displayMovie.movieTagline}"
              </p>
            )}
          </div>
          {!displayMovie.movieBackdrop && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl p-2"
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-300">Loading details...</span>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Poster */}
              <div className="lg:col-span-1">
                <div className="aspect-[2/3] bg-dark-700 rounded-lg overflow-hidden mb-4">
                  <img
                    src={posterUrl}
                    alt={displayMovie.movieTitle || 'Movie Poster'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
                    }}
                  />
                </div>

                {/* Quick Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Rating:</span>
                    <span className="bg-yellow-500 text-black px-2 py-1 rounded font-semibold">
                      ★ {rating}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Year:</span>
                    <span className="text-white">{displayMovie.movieYear || 'Unknown'}</span>
                  </div>

                  {displayMovie.movieRuntime && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Runtime:</span>
                      <span className="text-white">{displayMovie.movieRuntime} min</span>
                    </div>
                  )}

                  {displayMovie.movieContentRating && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Rating:</span>
                      <span className="bg-dark-600 px-2 py-1 rounded text-gray-300">
                        {displayMovie.movieContentRating}
                      </span>
                    </div>
                  )}

                  {displayMovie.movieReleaseDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Release:</span>
                      <span className="text-white">
                        {new Date(displayMovie.movieReleaseDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Overview */}
                {displayMovie.movieOverview && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Overview</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {displayMovie.movieOverview}
                    </p>
                  </div>
                )}

                {/* Tagline */}
                {displayMovie.movieTagline && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Tagline</h3>
                    <p className="text-gray-300 italic">
                      "{displayMovie.movieTagline}"
                    </p>
                  </div>
                )}

                {/* Genres */}
                {displayMovie.movieGenres && displayMovie.movieGenres.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Genres</h3>
                    <div className="flex flex-wrap gap-2">
                      {displayMovie.movieGenres.map((genre: string, index: number) => (
                        <span
                          key={index}
                          className="bg-primary-600 px-3 py-1 rounded-full text-sm text-white"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Directors */}
                {displayMovie.movieDirectors && displayMovie.movieDirectors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Directors</h3>
                    <div className="flex flex-wrap gap-2">
                      {displayMovie.movieDirectors.map((director: string, index: number) => (
                        <span
                          key={index}
                          className="bg-blue-600 px-3 py-1 rounded-full text-sm text-white"
                        >
                          {director}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cast */}
                {displayMovie.movieActors && displayMovie.movieActors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Cast</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {displayMovie.movieActors.slice(0, 12).map((actor: string, index: number) => (
                        <span
                          key={index}
                          className="bg-dark-600 px-3 py-1 rounded text-sm text-gray-300"
                        >
                          {actor}
                        </span>
                      ))}
                      {displayMovie.movieActors.length > 12 && (
                        <span className="text-gray-400 text-sm px-3 py-1">
                          +{displayMovie.movieActors.length - 12} more...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Experiments */}
                {displayMovie.movieExperiments && displayMovie.movieExperiments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Experiments</h3>
                    <div className="flex flex-wrap gap-2">
                      {displayMovie.movieExperiments.map((movieExp: MovieExperiment) => {
                        // Add safety check for experiment data
                        if (!movieExp.experiment) {
                          console.error('Missing experiment data for MovieExperiment:', movieExp);
                          return null;
                        }
                        return (
                          <span
                            key={movieExp.id}
                            className="bg-purple-600 px-3 py-1 rounded-full text-sm text-white"
                          >
                            EXP {movieExp.experiment.experimentNumber}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Production Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayMovie.movieBudget && (
                    <div>
                      <h4 className="text-md font-semibold text-white mb-2">Budget</h4>
                      <p className="text-gray-300">{formatCurrency(displayMovie.movieBudget)}</p>
                    </div>
                  )}

                  {displayMovie.movieBoxOffice && (
                    <div>
                      <h4 className="text-md font-semibold text-white mb-2">Box Office</h4>
                      <p className="text-gray-300">{formatCurrency(displayMovie.movieBoxOffice)}</p>
                    </div>
                  )}
                </div>

                {/* External Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayMovie.movieTmdbUrl && (
                    <a
                      href={displayMovie.movieTmdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-center transition-colors"
                    >
                      View on TMDb
                    </a>
                  )}

                  {displayMovie.movieImdbUrl && (
                    <a
                      href={displayMovie.movieImdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-center transition-colors"
                    >
                      View on IMDb
                    </a>
                  )}
                </div>

                {/* Experiments Section */}
                {displayMovie.movieExperiments && displayMovie.movieExperiments.length > 0 && (
                  <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                      🎬 Bad Movie Experiments
                    </h3>
                    <div className="space-y-3">
                      {displayMovie.movieExperiments.map((movieExp: MovieExperiment) => {
                        // Add safety check for experiment data
                        if (!movieExp.experiment) {
                          console.error('Missing experiment data for MovieExperiment:', movieExp);
                          return null;
                        }
                        
                        const experiment = movieExp.experiment;
                        
                        return (
                          <div key={movieExp.id} className="bg-dark-700 rounded-lg p-3 border border-purple-500/20">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                    Experiment {experiment.experimentNumber || 'Unknown'}
                                  </span>
                                  <span className="text-gray-300 text-sm">
                                    {experiment.eventDate ? new Date(experiment.eventDate).toLocaleDateString() : 'Unknown Date'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-400">Host:</span>
                                    <span className="text-white ml-2">{experiment.eventHost || 'Unknown'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Location:</span>
                                    <span className="text-white ml-2">{experiment.eventLocation || 'Unknown'}</span>
                                  </div>
                                </div>
                                {experiment.eventNotes && (
                                  <p className="text-gray-300 text-sm mt-2 italic">
                                    "{experiment.eventNotes}"
                                  </p>
                                )}
                              </div>
                              {experiment.eventImage && (
                                <img 
                                  src={experiment.eventImage} 
                                  alt={`Experiment ${experiment.experimentNumber || 'Unknown'}`}
                                  className="w-16 h-16 object-cover rounded ml-3"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* System Info */}
                <div className="border-t border-dark-600 pt-4">
                  <h4 className="text-md font-semibold text-white mb-3">System Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Database ID:</span>
                      <p className="text-white">{displayMovie.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">WordPress ID:</span>
                      <p className="text-white">{displayMovie.wordpressId || 'Not synced'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Sync Status:</span>
                      <p className={`font-medium ${
                        displayMovie.syncStatus === 'synced' 
                          ? 'text-green-400' 
                          : displayMovie.syncStatus === 'pending'
                          ? 'text-yellow-400'
                          : 'text-gray-400'
                      }`}>
                        {displayMovie.syncStatus}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Added:</span>
                      <p className="text-white">
                        {new Date(displayMovie.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-dark-600">
              {/* Left side - Sync button */}
              <div>
                {displayMovie.movieTmdbId && !displayMovie.excludeFromTmdbSync && (
                  <button
                    onClick={handleSyncWithTMDb}
                    disabled={syncing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded transition-colors flex items-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        Sync with TMDb
                      </>
                    )}
                  </button>
                )}
                {displayMovie.excludeFromTmdbSync && (
                  <span className="bg-orange-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2">
                    🚫 TMDb sync disabled
                  </span>
                )}
              </div>

              {/* Right side - Main actions */}
              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => onEdit(movie)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors"
                >
                  Edit Movie
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded transition-colors"
                >
                  Delete Movie
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
