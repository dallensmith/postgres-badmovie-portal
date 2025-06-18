import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Movie } from '../components/MovieCard';
import { MovieFormModal, MovieFormData } from '../components/MovieFormModal';
import { TMDbSearchModal } from '../components/TMDbSearchModal';
import { apiService } from '../services/api';

interface NewExperiment {
  experimentNumber: string;
  eventDate: string;
  eventTime: string;
  eventTimezone: string;
  eventHost: string;
  eventLocation: string;
  eventNotes: string;
  eventImage: string;
  postUrl: string;
}

export default function CreateExperimentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  // Experiment data
  const [experimentData, setExperimentData] = useState<NewExperiment>({
    experimentNumber: '',
    eventDate: (() => {
      // Get today's date in EST timezone
      const today = new Date();
      const estDate = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}));
      return estDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    })(),
    eventTime: '22:00',
    eventTimezone: 'America/New_York',
    eventHost: '',
    eventLocation: '',
    eventNotes: '',
    eventImage: '',
    postUrl: ''
  });

  // Selected movies for this experiment
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);

  // Modal states
  const [movieFormModal, setMovieFormModal] = useState<{
    isOpen: boolean;
    movie: Movie | null;
  }>({ isOpen: false, movie: null });

  const [tmdbModal, setTmdbModal] = useState(false);
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null);

  // Loading and error states
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const initializePage = async () => {
      if (isEditMode && id) {
        // Load existing experiment data
        try {
          const experiment = await apiService.getExperiment(parseInt(id));
          
          // Populate form with existing data
          setExperimentData({
            experimentNumber: experiment.experimentNumber || '',
            eventDate: experiment.eventDate ? experiment.eventDate.split('T')[0] : '',
            eventTime: experiment.eventTime || '22:00',
            eventTimezone: experiment.eventTimezone || 'America/New_York',
            eventHost: experiment.eventHost || '',
            eventLocation: experiment.eventLocation || '',
            eventNotes: experiment.eventNotes || '',
            eventImage: experiment.eventImage || '',
            postUrl: experiment.postUrl || ''
          });
          
          // Load associated movies
          if (experiment.movieExperiments && experiment.movieExperiments.length > 0) {
            const movies = experiment.movieExperiments.map((me: any) => me.movie);
            setSelectedMovies(movies);
          }
          
        } catch (error) {
          console.error('Failed to load experiment for editing:', error);
        }
      } else {
        // Create mode - fetch next experiment number
        try {
          const experiments = await apiService.getExperimentsList();
          let calculatedNumber = '001';
          
          if (experiments.length === 0) {
            calculatedNumber = '001';
          } else {
            const maxNumber = Math.max(...experiments.map(exp => parseInt(exp.experimentNumber) || 0));
            calculatedNumber = String(maxNumber + 1).padStart(3, '0');
          }
          
          // Set the experiment number
          setExperimentData(prev => ({
            ...prev,
            experimentNumber: calculatedNumber
          }));
        } catch (error) {
          console.error('Failed to fetch next experiment number:', error);
          setExperimentData(prev => ({
            ...prev,
            experimentNumber: '001'
          }));
        }
      }
    };

    initializePage();
  }, [isEditMode, id]);

  const handleInputChange = (field: keyof NewExperiment, value: string | boolean) => {
    setExperimentData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMovieAdd = () => {
    setMovieFormModal({ isOpen: true, movie: null });
  };

  const handleTmdbImport = () => {
    setTmdbModal(true);
  };

  const handleTmdbMovieSelect = (tmdbId: number) => {
    setTmdbModal(false);
    setMovieFormModal({ isOpen: true, movie: null });
    setSelectedTmdbId(tmdbId);
  };

  const handleMovieSave = async (movieData: MovieFormData) => {
    try {
      // Check for existing movie by calling the API (backend handles duplicate detection)
      const response = await fetch('/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(movieData)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create movie: ${errorData}`);
      }

      const savedMovie = await response.json();
      const isExistingMovie = response.status === 200; // 200 = existing movie, 201 = new movie
      
      // Add the movie to our selected movies list
      setSelectedMovies(prev => {
        // Check if movie already exists in our current selection
        const existsInSelection = prev.some(m => m.id === savedMovie.id);
        
        if (existsInSelection) {
          // Movie is already in selection, don't add again
          return prev;
        } else {
          // Add movie to selection
          return [...prev, savedMovie];
        }
      });

      // Close modal
      setMovieFormModal({ isOpen: false, movie: null });
      setSelectedTmdbId(null);
      
      // Show notification based on whether it was new or existing
      if (isExistingMovie) {
        setNotification({
          message: `Movie "${savedMovie.movieTitle}" already exists - linked to experiment`,
          type: 'info'
        });
      } else {
        setNotification({
          message: `New movie "${savedMovie.movieTitle}" created and added to experiment`,
          type: 'success'
        });
      }
      
    } catch (error) {
      console.error('Failed to save movie:', error);
      // Let the MovieFormModal handle the error display
      throw error;
    }
  };

  const handleMovieRemove = (movieIndex: number) => {
    setSelectedMovies(prev => prev.filter((_, index) => index !== movieIndex));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!experimentData.experimentNumber.trim()) {
      newErrors.experimentNumber = 'Experiment number is required';
    }
    if (!experimentData.eventDate) {
      newErrors.eventDate = 'Event date is required';
    }
    if (!experimentData.eventHost.trim()) {
      newErrors.eventHost = 'Host is required';
    }
    if (!experimentData.eventLocation.trim()) {
      newErrors.eventLocation = 'Location is required';
    }
    if (selectedMovies.length === 0) {
      newErrors.movies = 'At least one movie is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveExperiment = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      let experiment: any;
      
      if (isEditMode && id) {
        // Update existing experiment
        experiment = await apiService.updateExperiment(parseInt(id), experimentData);
        
        // For edit mode, we'll keep the movie linking simple - 
        // the user can add/remove movies using the UI, and we just save what's currently selected
        // No need to diff - just ensure all selected movies are linked
        
        const moviePromises = selectedMovies.map(async (movie) => {
          if (!movie.id) {
            throw new Error('Movie missing ID - this should not happen');
          }
          
          // Try to link - if already linked, the backend should handle it gracefully
          try {
            await apiService.linkMovieToExperiment(experiment.id, movie.id);
          } catch (error) {
            // Link might already exist, which is fine
            console.warn('Movie link may already exist:', error);
          }
          return movie;
        });

        await Promise.all(moviePromises);
        
      } else {
        // Create new experiment
        experiment = await apiService.createExperiment(experimentData);
        
        // Create/save movies and link them to the experiment
        const moviePromises = selectedMovies.map(async (movie) => {
          // Since we're creating movies directly in handleMovieSave, 
          // all movies in selectedMovies should already have IDs
          if (!movie.id) {
            throw new Error('Movie missing ID - this should not happen');
          }
          
          // Link movie to experiment
          await apiService.linkMovieToExperiment(experiment.id, movie.id);
          
          return movie;
        });

        await Promise.all(moviePromises);
      }

      // Navigate back to experiments page
      navigate('/experiments');
      
    } catch (error) {
      console.error('Failed to save experiment:', error);
      setErrors({ submit: 'Failed to save experiment. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const canSave = experimentData.experimentNumber && 
                  experimentData.eventDate && 
                  experimentData.eventHost && 
                  experimentData.eventLocation && 
                  selectedMovies.length > 0;

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-600' :
          notification.type === 'info' ? 'bg-blue-600' :
          notification.type === 'warning' ? 'bg-yellow-600' :
          'bg-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-white text-sm">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="text-white hover:text-gray-200 ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="max-w-7xl mx-auto p-6 pb-0">
        <div className="bg-dark-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/experiments')}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ←
              </button>
              <div>
                <h1 className="text-2xl font-bold">
                  {isEditMode ? 'Edit Experiment' : 'Create New Experiment'}
                </h1>
                <p className="text-gray-400">
                  {isEditMode ? 'Update experiment details and movies' : 'Set up experiment details and add movies'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/experiments')}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExperiment}
                disabled={!canSave || saving}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  isEditMode ? 'Update Experiment' : 'Save Experiment'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Experiment Details */}
          <div className="space-y-6">
            <div className="bg-dark-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Experiment Details</h2>
              
              {/* Experiment Form - Reusing the exact form from ExperimentModal */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Experiment Number *
                    </label>
                    <input
                      type="text"
                      value={experimentData.experimentNumber}
                      onChange={(e) => handleInputChange('experimentNumber', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="001"
                      required
                    />
                    {errors.experimentNumber && (
                      <p className="text-red-400 text-sm mt-1">{errors.experimentNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={experimentData.eventDate}
                      onChange={(e) => handleInputChange('eventDate', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                    {errors.eventDate && (
                      <p className="text-red-400 text-sm mt-1">{errors.eventDate}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Event Time *
                    </label>
                    <input
                      type="time"
                      value={experimentData.eventTime}
                      onChange={(e) => handleInputChange('eventTime', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Timezone *
                    </label>
                    <select
                      value={experimentData.eventTimezone}
                      onChange={(e) => handleInputChange('eventTimezone', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="America/New_York">EST (Eastern)</option>
                      <option value="America/Chicago">CST (Central)</option>
                      <option value="America/Denver">MST (Mountain)</option>
                      <option value="America/Los_Angeles">PST (Pacific)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Host *
                    </label>
                    <input
                      type="text"
                      value={experimentData.eventHost}
                      onChange={(e) => handleInputChange('eventHost', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Host name"
                      required
                    />
                    {errors.eventHost && (
                      <p className="text-red-400 text-sm mt-1">{errors.eventHost}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={experimentData.eventLocation}
                      onChange={(e) => handleInputChange('eventLocation', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Event location"
                      required
                    />
                    {errors.eventLocation && (
                      <p className="text-red-400 text-sm mt-1">{errors.eventLocation}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Event Image URL
                    </label>
                    <input
                      type="url"
                      value={experimentData.eventImage}
                      onChange={(e) => handleInputChange('eventImage', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Post URL
                    </label>
                    <input
                      type="url"
                      value={experimentData.postUrl}
                      onChange={(e) => handleInputChange('postUrl', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://bigscreenbadmovies.com/experiment-xxx/"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={experimentData.eventNotes}
                    onChange={(e) => handleInputChange('eventNotes', e.target.value)}
                    rows={3}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional notes about the experiment"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Movie Management */}
          <div className="space-y-6">
            <div className="bg-dark-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">Add Movies</h2>
              
              <div className="space-y-4">
                {/* Movie Action Buttons */}
                <div className="space-y-3">
                  <button 
                    onClick={handleMovieAdd}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📝</span>
                    Add New Movie
                  </button>
                  
                  <button 
                    onClick={handleTmdbImport}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🎬</span>
                    Import from TMDb
                  </button>
                </div>

                {/* Selected Movies List */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Selected Movies</h3>
                    <span className="text-sm text-gray-400">
                      {selectedMovies.length} movie{selectedMovies.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {errors.movies && (
                    <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded-lg mb-4">
                      {errors.movies}
                    </div>
                  )}

                  {selectedMovies.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="mb-2">No movies added yet</p>
                      <p className="text-sm">Use the buttons above to add movies to this experiment</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedMovies.map((movie, index) => (
                        <div key={index} className="flex items-center gap-3 bg-dark-700 rounded-lg p-3">
                          {movie.moviePoster && (
                            <img
                              src={movie.moviePoster}
                              alt={movie.movieTitle || 'Movie poster'}
                              className="w-12 h-18 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{movie.movieTitle}</h4>
                            {movie.movieYear && (
                              <p className="text-sm text-gray-400">({movie.movieYear})</p>
                            )}
                            {movie.movieOverview && (
                              <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                {movie.movieOverview}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleMovieRemove(index)}
                            className="text-red-400 hover:text-red-300 p-2 rounded transition-colors"
                            title="Remove movie"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Movie Form Modal - Exact same component */}
      <MovieFormModal
        key={movieFormModal.movie?.id || 'new'}
        movie={movieFormModal.movie}
        isOpen={movieFormModal.isOpen}
        onClose={() => {
          setMovieFormModal({ isOpen: false, movie: null });
          setSelectedTmdbId(null);
        }}
        onSave={handleMovieSave}
        tmdbId={selectedTmdbId}
      />

      {/* TMDb Search Modal - Exact same component */}
      <TMDbSearchModal
        isOpen={tmdbModal}
        onClose={() => setTmdbModal(false)}
        onSelectMovie={handleTmdbMovieSelect}
      />

      {/* Error Display */}
      {errors.submit && (
        <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg shadow-lg">
          {errors.submit}
        </div>
      )}
    </div>
  );
}
