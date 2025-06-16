import React from 'react';

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
  createdAt: string;
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
  const posterUrl = movie.moviePoster || '/placeholder-movie.svg';
  const rating = movie.movieTmdbRating ? parseFloat(movie.movieTmdbRating).toFixed(1) : 'N/A';
  const runtime = movie.movieRuntime ? `${movie.movieRuntime} min` : 'Unknown';

  return (
    <div className="bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
        <div className="absolute top-2 right-2">
          <span className="bg-yellow-500 text-black px-2 py-1 rounded text-sm font-semibold">
            ★ {rating}
          </span>
        </div>
      </div>

      {/* Movie Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
          {movie.movieTitle || 'Untitled Movie'}
        </h3>
        
        {movie.movieOriginalTitle && movie.movieOriginalTitle !== movie.movieTitle && (
          <p className="text-gray-400 text-sm mb-2 italic">
            {movie.movieOriginalTitle}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
          <span>{movie.movieYear || 'Unknown Year'}</span>
          <span>{runtime}</span>
        </div>

        {movie.movieContentRating && (
          <div className="mb-2">
            <span className="bg-dark-600 px-2 py-1 rounded text-xs text-gray-300">
              {movie.movieContentRating}
            </span>
          </div>
        )}

        {movie.movieGenres && movie.movieGenres.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {movie.movieGenres.slice(0, 3).map((genre, index) => (
                <span
                  key={index}
                  className="bg-primary-600 px-2 py-1 rounded text-xs text-white"
                >
                  {genre}
                </span>
              ))}
              {movie.movieGenres.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{movie.movieGenres.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {movie.movieOverview && (
          <p className="text-gray-300 text-sm mb-3 line-clamp-3">
            {movie.movieOverview}
          </p>
        )}

        {/* Directors and Actors */}
        {movie.movieDirectors && movie.movieDirectors.length > 0 && (
          <p className="text-xs text-gray-400 mb-1">
            <span className="font-medium">Director:</span> {movie.movieDirectors.slice(0, 2).join(', ')}
            {movie.movieDirectors.length > 2 && ` +${movie.movieDirectors.length - 2} more`}
          </p>
        )}

        {movie.movieActors && movie.movieActors.length > 0 && (
          <p className="text-xs text-gray-400 mb-3">
            <span className="font-medium">Stars:</span> {movie.movieActors.slice(0, 3).join(', ')}
            {movie.movieActors.length > 3 && ` +${movie.movieActors.length - 3} more`}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onView && (
            <button
              onClick={() => onView(movie)}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-3 rounded text-sm transition-colors"
            >
              View Details
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(movie)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(movie.id)}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        {/* Sync Status */}
        <div className="mt-2 pt-2 border-t border-dark-600">
          <div className="flex items-center justify-between text-xs">
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
