import { useState, useEffect } from 'react';
import { Movie } from './MovieCard';

export interface MovieFormData {
  movieTitle: string;
  movieOriginalTitle?: string;
  movieYear?: string;
  movieReleaseDate?: string;
  movieRuntime?: number;
  movieTagline?: string;
  movieOverview?: string;
  movieContentRating?: string;
  movieBudget?: string;
  movieBoxOffice?: string;
  moviePoster?: string;
  movieBackdrop?: string;
  movieTrailer?: string;
  movieTmdbId?: string;
  movieTmdbUrl?: string;
  movieTmdbRating?: string;
  movieTmdbVotes?: string;
  movieImdbId?: string;
  movieImdbUrl?: string;
  movieActors?: string[];
  movieDirectors?: string[];
  movieWriters?: string[];
  movieGenres?: string[];
  movieCountries?: string[];
  movieLanguages?: string[];
  movieStudios?: string[];
  movieAmazonLink?: string;
}

export interface MovieFormModalProps {
  movie?: Movie | null; // null/undefined = add mode, Movie = edit mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MovieFormData) => Promise<void>;
  title?: string;
}

export const MovieFormModal: React.FC<MovieFormModalProps> = ({
  movie,
  isOpen,
  onClose,
  onSave,
  title
}) => {
  const isEditMode = !!movie;
  const modalTitle = title || (isEditMode ? 'Edit Movie' : 'Add New Movie');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  // Initialize form data from movie prop or defaults
  const getInitialFormData = (): MovieFormData => {
    if (isEditMode && movie) {
      return {
        movieTitle: movie.movieTitle || '',
        movieOriginalTitle: movie.movieOriginalTitle || '',
        movieYear: movie.movieYear || '',
        movieReleaseDate: movie.movieReleaseDate ? movie.movieReleaseDate.split('T')[0] : '',
        movieRuntime: movie.movieRuntime || undefined,
        movieTagline: movie.movieTagline || '',
        movieOverview: movie.movieOverview || '',
        movieContentRating: movie.movieContentRating || '',
        movieBudget: movie.movieBudget || '',
        movieBoxOffice: movie.movieBoxOffice || '',
        moviePoster: movie.moviePoster || '',
        movieBackdrop: movie.movieBackdrop || '',
        movieTrailer: movie.movieTrailer || '',
        movieTmdbId: movie.movieTmdbId || '',
        movieTmdbUrl: movie.movieTmdbUrl || '',
        movieTmdbRating: movie.movieTmdbRating || '',
        movieTmdbVotes: movie.movieTmdbVotes || '',
        movieImdbId: movie.movieImdbId || '',
        movieImdbUrl: movie.movieImdbUrl || '',
        movieActors: movie.movieActors || [],
        movieDirectors: movie.movieDirectors || [],
        movieWriters: movie.movieWriters || [],
        movieGenres: movie.movieGenres || [],
        movieCountries: movie.movieCountries || [],
        movieLanguages: movie.movieLanguages || [],
        movieStudios: movie.movieStudios || [],
        movieAmazonLink: movie.movieAmazonLink || ''
      };
    } else {
      return {
        movieTitle: '',
        movieOriginalTitle: '',
        movieYear: '',
        movieReleaseDate: '',
        movieRuntime: undefined,
        movieTagline: '',
        movieOverview: '',
        movieContentRating: '',
        movieBudget: '',
        movieBoxOffice: '',
        moviePoster: '',
        movieBackdrop: '',
        movieTrailer: '',
        movieTmdbId: '',
        movieTmdbUrl: '',
        movieTmdbRating: '',
        movieTmdbVotes: '',
        movieImdbId: '',
        movieImdbUrl: '',
        movieActors: [],
        movieDirectors: [],
        movieWriters: [],
        movieGenres: [],
        movieCountries: [],
        movieLanguages: [],
        movieStudios: [],
        movieAmazonLink: ''
      };
    }
  };

  const [formData, setFormData] = useState<MovieFormData>(getInitialFormData);

  // Reset form data when movie changes
  useEffect(() => {
    console.log('MovieFormModal - movie or isOpen changed:', { isEditMode, movieId: movie?.id, isOpen });
    setFormData(getInitialFormData());
    setErrors({});
    setActiveTab('basic');
  }, [movie?.id, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.movieTitle.trim()) {
      newErrors.movieTitle = 'Movie title is required';
    }

    if (formData.movieYear && !/^\d{4}$/.test(formData.movieYear)) {
      newErrors.movieYear = 'Year must be a 4-digit number';
    }

    if (formData.movieRuntime && formData.movieRuntime <= 0) {
      newErrors.movieRuntime = 'Runtime must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Clean up the data before sending
      const cleanData = { ...formData };
      
      // Convert runtime to number if provided
      if (cleanData.movieRuntime) {
        cleanData.movieRuntime = Number(cleanData.movieRuntime);
      }

      await onSave(cleanData);
      onClose();
    } catch (error) {
      console.error('Error saving movie:', error);
      setErrors({ submit: 'Failed to save movie. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleArrayFieldChange = (field: keyof MovieFormData, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleInputChange = (field: keyof MovieFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  // Debug: Log current form data
  console.log('Current formData state:', formData);

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'details', label: 'Details', icon: '📊' },
    { id: 'people', label: 'Cast & Crew', icon: '👥' },
    { id: 'external', label: 'External Links', icon: '🔗' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-dark-600">
          <h2 className="text-2xl font-bold text-white">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl p-2"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-600 bg-dark-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white bg-dark-800 border-b-2 border-primary-600'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Movie Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Movie Title *
                    </label>
                    <input
                      type="text"
                      value={formData.movieTitle}
                      onChange={(e) => handleInputChange('movieTitle', e.target.value)}
                      className={`w-full bg-dark-700 border rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.movieTitle ? 'border-red-500' : 'border-dark-600'
                      }`}
                      placeholder="Enter movie title"
                    />
                    {errors.movieTitle && (
                      <p className="text-red-400 text-sm mt-1">{errors.movieTitle}</p>
                    )}
                  </div>

                  {/* Original Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Original Title
                    </label>
                    <input
                      type="text"
                      value={formData.movieOriginalTitle}
                      onChange={(e) => handleInputChange('movieOriginalTitle', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Original title (if different)"
                    />
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Year
                    </label>
                    <input
                      type="text"
                      value={formData.movieYear}
                      onChange={(e) => handleInputChange('movieYear', e.target.value)}
                      className={`w-full bg-dark-700 border rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.movieYear ? 'border-red-500' : 'border-dark-600'
                      }`}
                      placeholder="2024"
                      maxLength={4}
                    />
                    {errors.movieYear && (
                      <p className="text-red-400 text-sm mt-1">{errors.movieYear}</p>
                    )}
                  </div>

                  {/* Release Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Release Date
                    </label>
                    <input
                      type="date"
                      value={formData.movieReleaseDate}
                      onChange={(e) => handleInputChange('movieReleaseDate', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Runtime */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Runtime (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.movieRuntime || ''}
                      onChange={(e) => handleInputChange('movieRuntime', e.target.value ? Number(e.target.value) : 0)}
                      className={`w-full bg-dark-700 border rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.movieRuntime ? 'border-red-500' : 'border-dark-600'
                      }`}
                      placeholder="120"
                      min={1}
                    />
                    {errors.movieRuntime && (
                      <p className="text-red-400 text-sm mt-1">{errors.movieRuntime}</p>
                    )}
                  </div>

                  {/* Content Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Content Rating
                    </label>
                    <select
                      value={formData.movieContentRating}
                      onChange={(e) => handleInputChange('movieContentRating', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select rating</option>
                      <option value="G">G</option>
                      <option value="PG">PG</option>
                      <option value="PG-13">PG-13</option>
                      <option value="R">R</option>
                      <option value="NC-17">NC-17</option>
                      <option value="NR">Not Rated</option>
                    </select>
                  </div>
                </div>

                {/* Poster URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Poster URL
                  </label>
                  <input
                    type="url"
                    value={formData.moviePoster}
                    onChange={(e) => handleInputChange('moviePoster', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://image.tmdb.org/t/p/w500/..."
                  />
                  {formData.moviePoster && (
                    <div className="mt-2">
                      <img
                        src={formData.moviePoster}
                        alt="Poster preview"
                        className="w-24 h-36 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Overview */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Overview
                  </label>
                  <textarea
                    value={formData.movieOverview}
                    onChange={(e) => handleInputChange('movieOverview', e.target.value)}
                    rows={4}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Movie plot summary..."
                  />
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Tagline */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.movieTagline}
                    onChange={(e) => handleInputChange('movieTagline', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Catchy movie tagline"
                  />
                  <div style={{fontSize: '10px', color: 'yellow'}}>
                    Debug - tagline value: "{formData.movieTagline}"
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Budget
                    </label>
                    <input
                      type="text"
                      value={formData.movieBudget}
                      onChange={(e) => handleInputChange('movieBudget', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="$1,000,000"
                    />
                  </div>

                  {/* Box Office */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Box Office
                    </label>
                    <input
                      type="text"
                      value={formData.movieBoxOffice}
                      onChange={(e) => handleInputChange('movieBoxOffice', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="$5,000,000"
                    />
                  </div>
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Genres
                  </label>
                  <input
                    type="text"
                    value={formData.movieGenres?.join(', ') || ''}
                    onChange={(e) => handleArrayFieldChange('movieGenres', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Action, Comedy, Horror (comma-separated)"
                  />
                </div>

                {/* Countries */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Countries
                  </label>
                  <input
                    type="text"
                    value={formData.movieCountries?.join(', ') || ''}
                    onChange={(e) => handleArrayFieldChange('movieCountries', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="United States, Canada (comma-separated)"
                  />
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Languages
                  </label>
                  <input
                    type="text"
                    value={formData.movieLanguages?.join(', ') || ''}
                    onChange={(e) => handleArrayFieldChange('movieLanguages', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="English, Spanish (comma-separated)"
                  />
                </div>

                {/* Studios */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Studios
                  </label>
                  <input
                    type="text"
                    value={formData.movieStudios?.join(', ') || ''}
                    onChange={(e) => handleArrayFieldChange('movieStudios', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Universal Pictures, Warner Bros (comma-separated)"
                  />
                </div>
              </div>
            )}

            {/* Cast & Crew Tab */}
            {activeTab === 'people' && (
              <div className="space-y-6">
                {/* Directors */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Directors
                  </label>
                  <input
                    type="text"
                    value={formData.movieDirectors?.join(', ') || ''}
                    onChange={(e) => handleArrayFieldChange('movieDirectors', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Steven Spielberg, Christopher Nolan (comma-separated)"
                  />
                </div>

                {/* Writers */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Writers
                  </label>
                  <input
                    type="text"
                    value={formData.movieWriters?.join(', ') || ''}
                    onChange={(e) => handleArrayFieldChange('movieWriters', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Writer 1, Writer 2 (comma-separated)"
                  />
                  <div style={{fontSize: '10px', color: 'yellow'}}>
                    Debug - writers value: "{formData.movieWriters?.join(', ') || ''}"
                  </div>
                </div>

                {/* Actors */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cast
                  </label>
                  <textarea
                    value={formData.movieActors?.join(', ') || ''}
                    onChange={(e) => handleArrayFieldChange('movieActors', e.target.value)}
                    rows={4}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Actor 1, Actor 2, Actor 3 (comma-separated)"
                  />
                </div>
              </div>
            )}

            {/* External Links Tab */}
            {activeTab === 'external' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* TMDb ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      TMDb ID
                    </label>
                    <input
                      type="text"
                      value={formData.movieTmdbId}
                      onChange={(e) => handleInputChange('movieTmdbId', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="123456"
                    />
                  </div>

                  {/* TMDb Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      TMDb Rating
                    </label>
                    <input
                      type="text"
                      value={formData.movieTmdbRating}
                      onChange={(e) => handleInputChange('movieTmdbRating', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="7.5"
                    />
                  </div>

                  {/* IMDb ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      IMDb ID
                    </label>
                    <input
                      type="text"
                      value={formData.movieImdbId}
                      onChange={(e) => handleInputChange('movieImdbId', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="tt1234567"
                    />
                  </div>

                  {/* TMDb Votes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      TMDb Votes
                    </label>
                    <input
                      type="text"
                      value={formData.movieTmdbVotes}
                      onChange={(e) => handleInputChange('movieTmdbVotes', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="1500"
                    />
                  </div>
                </div>

                {/* URLs */}
                <div className="grid grid-cols-1 gap-6">
                  {/* TMDb URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      TMDb URL
                    </label>
                    <input
                      type="url"
                      value={formData.movieTmdbUrl}
                      onChange={(e) => handleInputChange('movieTmdbUrl', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://www.themoviedb.org/movie/123456"
                    />
                  </div>

                  {/* IMDb URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      IMDb URL
                    </label>
                    <input
                      type="url"
                      value={formData.movieImdbUrl}
                      onChange={(e) => handleInputChange('movieImdbUrl', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://www.imdb.com/title/tt1234567"
                    />
                    <div style={{fontSize: '10px', color: 'yellow'}}>
                      Debug - IMDb URL value: "{formData.movieImdbUrl}"
                    </div>
                  </div>

                  {/* Amazon Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amazon Affiliate Link
                    </label>
                    <input
                      type="url"
                      value={formData.movieAmazonLink}
                      onChange={(e) => handleInputChange('movieAmazonLink', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://amazon.com/..."
                    />
                  </div>

                  {/* Trailer URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Trailer URL
                    </label>
                    <input
                      type="url"
                      value={formData.movieTrailer}
                      onChange={(e) => handleInputChange('movieTrailer', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 p-6 border-t border-dark-600 bg-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Movie' : 'Add Movie')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
