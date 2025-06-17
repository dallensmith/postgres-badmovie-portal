import React from 'react';

export interface Experiment {
  id: number;
  experimentNumber: string;
  eventDate: string;
  eventHost: string;
  postUrl: string | null;
  eventEncore: boolean;
  eventLocation: string;
  eventImageWpId: number | null;
  eventImage: string | null;
  eventNotes: string | null;
  eventAttendees: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovieExperiment {
  id: number;
  movieId: number;
  experimentId: number;
  experiment: Experiment;
  createdAt: string;
}

export interface Movie {
  id: number;
  movieTitle: string | null;
  movieOriginalTitle: string | null;
  movieYear: string | null;
  movieReleaseDate: string | null;
  movieRuntime: number | null;
  movieTagline: string | null;
  movieOverview: string | null;
  movieContentRating: string | null;
  movieBudget: string | null;
  movieBoxOffice: string | null;
  moviePoster: string | null;
  movieBackdrop: string | null;
  movieTrailer: string | null;
  movieTmdbId: string | null;
  movieTmdbUrl: string | null;
  movieTmdbRating: string | null;
  movieTmdbVotes: string | null;
  movieImdbId: string | null;
  movieImdbUrl: string | null;
  movieActors: string[] | null;
  movieDirectors: string[] | null;
  movieWriters: string[] | null;
  movieGenres: string[] | null;
  movieCountries: string[] | null;
  movieLanguages: string[] | null;
  movieStudios: string[] | null;
  movieAmazonLink: string | null;
  wordpressId: number | null;
  syncStatus: string;
  excludeFromTmdbSync: boolean;
  movieExperiments?: MovieExperiment[];
  createdAt: string;
  
  // OMDb enhanced fields
  rottenTomatoesRating?: string | null;
  rottenTomatoesUrl?: string | null;
  imdbRating?: string | null;
  imdbVotes?: string | null;
  metacriticRating?: string | null;
  awards?: string | null;
  dvdRelease?: string | null;
  websiteUrl?: string | null;
  boxOfficeEnhanced?: string | null;
  plotEnhanced?: string | null;
}

export interface MovieCardProps {
  movie: Movie;
  onEdit?: (movie: Movie) => void;
  onDelete?: (movieId: number) => void;
  onView?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const formatContentRating = (rating: string | null) => {
    if (!rating) return null;
    
    // Normalize the rating
    const normalizedRating = rating.toUpperCase().trim();
    
    // Handle common variations
    if (normalizedRating === 'NOT RATED' || normalizedRating === 'UNRATED' || normalizedRating === 'NR') {
      return { text: 'N/R', color: 'bg-gray-600 text-white' };
    }
    
    switch (normalizedRating) {
      case 'G':
        return { text: 'G', color: 'bg-green-400 text-black' };
      case 'PG':
        return { text: 'PG', color: 'bg-green-600 text-white' };
      case 'PG-13':
        return { text: 'PG-13', color: 'bg-blue-600 text-white' };
      case 'R':
        return { text: 'R', color: 'bg-red-600 text-white' };
      case 'NC-17':
        return { text: 'NC-17', color: 'bg-red-800 text-white' };
      case 'X':
        return { text: 'X', color: 'bg-purple-600 text-white' };
      default:
        return { text: rating, color: 'bg-gray-600 text-white' };
    }
  };

  const posterUrl = movie.moviePoster || '/placeholder-movie.svg';
  const rating = movie.movieTmdbRating ? parseFloat(movie.movieTmdbRating).toFixed(1) : 'N/A';
  const runtime = movie.movieRuntime ? `${movie.movieRuntime} min` : 'Unknown';
  const contentRating = formatContentRating(movie.movieContentRating);

  return (
    <div className="bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      {/* Movie Poster */}
      <div className="relative aspect-[2/3] bg-dark-700">
        <img
          src={posterUrl}
          alt={movie.movieTitle || 'Unknown Movie'}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-movie.svg';
          }}
        />
        {/* Rating overlay - top right */}
        <div className="absolute top-2 right-2">
          <span className="bg-yellow-500 text-black px-2 py-1 rounded text-sm font-semibold">
            ★ {rating}
          </span>
        </div>
        
        {/* Experiment number overlay - top left */}
        {movie.movieExperiments && movie.movieExperiments.length > 0 && (
          <div className="absolute top-2 left-2">
            <span className="bg-purple-600 text-white px-2 py-1 rounded text-sm font-semibold">
              #{movie.movieExperiments[0].experiment.experimentNumber}
              {movie.movieExperiments.length > 1 && ` +${movie.movieExperiments.length - 1}`}
            </span>
          </div>
        )}
      </div>

      {/* Movie Info - Flex grow to push buttons to bottom */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Title and Rating */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1">
            {movie.movieTitle || 'Untitled Movie'}
          </h3>
          <div className="flex items-center gap-1 ml-2">
            {contentRating && (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${contentRating.color}`}>
                {contentRating.text}
              </span>
            )}
          </div>
        </div>
        
        {movie.movieOriginalTitle && movie.movieOriginalTitle !== movie.movieTitle && (
          <p className="text-gray-400 text-sm mb-2 italic line-clamp-1">
            {movie.movieOriginalTitle}
          </p>
        )}

        {/* Year and Runtime */}
        <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
          <span>{movie.movieYear || 'Unknown Year'}</span>
          <span>{runtime}</span>
        </div>

        {/* Genres */}
        {movie.movieGenres && movie.movieGenres.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {movie.movieGenres.slice(0, 2).map((genre, index) => (
                <span
                  key={index}
                  className="bg-primary-600 px-2 py-1 rounded text-xs text-white"
                >
                  {genre}
                </span>
              ))}
              {movie.movieGenres.length > 2 && (
                <span className="text-xs text-gray-400">
                  +{movie.movieGenres.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Overview - Limited height */}
        {movie.movieOverview && (
          <p className="text-gray-300 text-sm mb-2 line-clamp-2">
            {movie.movieOverview}
          </p>
        )}

        {/* Directors - Compact */}
        {movie.movieDirectors && movie.movieDirectors.length > 0 && (
          <p className="text-xs text-gray-400 mb-1 line-clamp-1">
            <span className="font-medium">Dir:</span> {movie.movieDirectors.slice(0, 1).join(', ')}
            {movie.movieDirectors.length > 1 && ` +${movie.movieDirectors.length - 1}`}
          </p>
        )}

        {/* Spacer to push buttons to bottom */}
        <div className="flex-grow"></div>

        {/* Action Buttons - Always at bottom */}
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            {onView && (
              <button
                onClick={() => onView(movie)}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-3 rounded text-sm transition-colors"
              >
                View
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(movie)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(movie.id)}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm transition-colors"
              >
                Del
              </button>
            )}
          </div>

          {/* Sync Status */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-dark-600">
            <span className="text-gray-400">
              ID: {movie.id}
            </span>
            <span className={`px-2 py-1 rounded ${
              movie.syncStatus === 'synced' 
                ? 'bg-green-600 text-white' 
                : movie.syncStatus === 'pending'
                ? 'bg-yellow-600 text-black'
                : 'bg-gray-600 text-white'
            }`}>
              {movie.syncStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
