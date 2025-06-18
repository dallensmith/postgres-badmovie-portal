import { useState, useEffect } from 'react';
import { Movie } from './MovieCard';
import { apiService, Experiment } from '../services/api';

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
  excludeFromTmdbSync?: boolean;
  shown3D?: boolean;
  
  // 🚀 Enhanced fields from OMDb dual-API enrichment
  rottenTomatoesRating?: string;
  rottenTomatoesUrl?: string;
  imdbRating?: string;
  imdbVotes?: string;
  metacriticRating?: string;
  awards?: string;
  websiteUrl?: string;
}

export interface MovieFormModalProps {
  movie?: Movie | null; // null/undefined = add mode, Movie = edit mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MovieFormData) => Promise<void>;
  title?: string;
  tmdbId?: number | null; // For auto-importing from TMDb search
}

export const MovieFormModal: React.FC<MovieFormModalProps> = ({
  movie,
  isOpen,
  onClose,
  onSave,
  title,
  tmdbId
}) => {
  const isEditMode = !!movie;
  const modalTitle = title || (isEditMode ? 'Edit Movie' : 'Add New Movie');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');
  const [syncing, setSyncing] = useState(false);
  const [syncingOmdb, setSyncingOmdb] = useState(false); // New state for OMDb syncing
  const [syncingOmdbSelective, setSyncingOmdbSelective] = useState(false); // State for selective OMDb sync

  // Experiment-related state
  const [availableExperiments, setAvailableExperiments] = useState<Experiment[]>([]);
  const [movieExperiments, setMovieExperiments] = useState<number[]>([]);
  const [experimentChanges, setExperimentChanges] = useState<{
    toAdd: number[];
    toRemove: number[];
  }>({ toAdd: [], toRemove: [] });
  const [experimentSearch, setExperimentSearch] = useState('');

  // Filter experiments based on search
  const filteredExperiments = experimentSearch
    ? availableExperiments.filter(exp =>
        exp.experimentNumber.toLowerCase().includes(experimentSearch.toLowerCase())
      )
    : [];

  // Initialize form data from movie prop or defaults
  const getInitialFormData = (): MovieFormData => {
    if (isEditMode && movie) {
      return {
        movieTitle: String(movie.movieTitle ?? ''),
        movieOriginalTitle: String(movie.movieOriginalTitle ?? ''),
        movieYear: String(movie.movieYear ?? ''),
        movieReleaseDate: movie.movieReleaseDate ? String(movie.movieReleaseDate).split('T')[0] : '',
        movieRuntime: movie.movieRuntime ?? undefined,
        movieTagline: String(movie.movieTagline ?? ''),
        movieOverview: String(movie.movieOverview ?? ''),
        movieContentRating: String(movie.movieContentRating ?? ''),
        movieBudget: String(movie.movieBudget ?? ''),
        movieBoxOffice: String(movie.movieBoxOffice ?? ''),
        moviePoster: String(movie.moviePoster ?? ''),
        movieBackdrop: String(movie.movieBackdrop ?? ''),
        movieTrailer: String(movie.movieTrailer ?? ''),
        movieTmdbId: String(movie.movieTmdbId ?? ''),
        movieTmdbUrl: String(movie.movieTmdbUrl ?? ''),
        movieTmdbRating: String(movie.movieTmdbRating ?? ''),
        movieTmdbVotes: String(movie.movieTmdbVotes ?? ''),
        movieImdbId: String(movie.movieImdbId ?? ''),
        movieImdbUrl: String(movie.movieImdbUrl ?? ''),
        movieActors: movie.movieActors ?? [],
        movieDirectors: movie.movieDirectors ?? [],
        movieWriters: movie.movieWriters ?? [],
        movieGenres: movie.movieGenres ?? [],
        movieCountries: movie.movieCountries ?? [],
        movieLanguages: movie.movieLanguages ?? [],
        movieStudios: movie.movieStudios ?? [],
        movieAmazonLink: String(movie.movieAmazonLink ?? ''),
        excludeFromTmdbSync: movie.excludeFromTmdbSync ?? false,
        shown3D: movie.shown3D ?? false,
        
        // OMDb fields - initialize from existing movie data
        rottenTomatoesRating: String(movie.rottenTomatoesRating ?? ''),
        rottenTomatoesUrl: String(movie.rottenTomatoesUrl ?? ''),
        imdbRating: String(movie.imdbRating ?? ''),
        imdbVotes: String(movie.imdbVotes ?? ''),
        metacriticRating: String(movie.metacriticRating ?? ''),
        awards: String(movie.awards ?? ''),
        websiteUrl: String(movie.websiteUrl ?? '')
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
        movieTmdbId: tmdbId ? tmdbId.toString() : '', // Pre-fill TMDb ID if provided
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
        movieAmazonLink: '',
        excludeFromTmdbSync: false,
        shown3D: false,
        
        // OMDb fields - initialize as empty for new movies
        rottenTomatoesRating: '',
        rottenTomatoesUrl: '',
        imdbRating: '',
        imdbVotes: '',
        metacriticRating: '',
        awards: '',
        websiteUrl: ''
      };
    }
  };

  const [formData, setFormData] = useState<MovieFormData>(() => getInitialFormData());

  // Reset form data when movie changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const newFormData = getInitialFormData();
      setFormData(newFormData);
      setErrors({});
      setActiveTab('basic');
      
      // Initialize movie experiments
      if (isEditMode && movie?.movieExperiments) {
        setMovieExperiments(movie.movieExperiments.map(me => me.experimentId));
      } else {
        setMovieExperiments([]);
      }
      setExperimentChanges({ toAdd: [], toRemove: [] });
      setExperimentSearch('');
    }
  }, [movie, isOpen, isEditMode]);

  // Load available experiments when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadExperiments = async () => {
        try {
          const experiments = await apiService.getExperimentsList();
          setAvailableExperiments(experiments);
        } catch (error) {
          console.error('Failed to load experiments:', error);
        }
      };
      
      loadExperiments();
    }
  }, [isOpen]);

  // Auto-sync with TMDb when tmdbId is provided (from TMDb search modal)
  useEffect(() => {
    if (isOpen && tmdbId && !movie && formData.movieTmdbId) {
      // Only auto-sync for new movies with tmdbId, not when editing existing movies
      const autoSync = async () => {
        if (!formData.movieTmdbId) return;

        try {
          // Get fresh data from TMDb
          const tmdbResponse = await fetch(`/api/tmdb/movie/${formData.movieTmdbId}`);
          if (!tmdbResponse.ok) {
            console.error('Failed to fetch data from TMDb');
            return;
          }

          const tmdbData = await tmdbResponse.json();

          // Update form data with TMDb data (now includes OMDb enrichment!)
          setFormData(prev => ({
            ...prev,
            movieTitle: tmdbData.title || prev.movieTitle,
            movieOriginalTitle: tmdbData.originalTitle || prev.movieOriginalTitle,
            movieYear: tmdbData.year || prev.movieYear,
            movieReleaseDate: tmdbData.releaseDate ? tmdbData.releaseDate.split('T')[0] : prev.movieReleaseDate,
            movieRuntime: tmdbData.runtime || prev.movieRuntime,
            movieTagline: tmdbData.tagline || prev.movieTagline,
            movieOverview: tmdbData.overview || prev.movieOverview,
            movieContentRating: tmdbData.contentRating || prev.movieContentRating, // Enhanced from OMDb
            movieBudget: tmdbData.budget?.toString() || prev.movieBudget,
            movieBoxOffice: tmdbData.boxOfficeEnhanced || tmdbData.boxOffice?.toString() || prev.movieBoxOffice,
            moviePoster: tmdbData.poster || prev.moviePoster,
            movieBackdrop: tmdbData.backdrop || prev.movieBackdrop,
            movieTrailer: tmdbData.trailer || prev.movieTrailer,
            movieTmdbUrl: tmdbData.tmdbUrl || prev.movieTmdbUrl,
            movieTmdbRating: tmdbData.rating?.toString() || prev.movieTmdbRating,
            movieTmdbVotes: tmdbData.voteCount?.toString() || prev.movieTmdbVotes,
            movieImdbId: tmdbData.imdbId || prev.movieImdbId,
            movieImdbUrl: tmdbData.imdbUrl || prev.movieImdbUrl,
            movieActors: tmdbData.cast || prev.movieActors,
            movieDirectors: tmdbData.directors || prev.movieDirectors,
            movieWriters: tmdbData.writers || prev.movieWriters,
            movieGenres: tmdbData.genres || prev.movieGenres,
            movieCountries: tmdbData.productionCountries || prev.movieCountries,
            movieLanguages: tmdbData.spokenLanguages || prev.movieLanguages,
            movieStudios: tmdbData.productionCompanies || prev.movieStudios,
            
            // 🚀 NEW: Enhanced data from OMDb dual-API enrichment
            rottenTomatoesRating: tmdbData.rottenTomatoesRating || prev.rottenTomatoesRating,
            rottenTomatoesUrl: tmdbData.rottenTomatoesUrl || prev.rottenTomatoesUrl,
            imdbRating: tmdbData.imdbRating || prev.imdbRating,
            imdbVotes: tmdbData.imdbVotes || prev.imdbVotes,
            metacriticRating: tmdbData.metacriticRating || prev.metacriticRating,
            awards: tmdbData.awards || prev.awards,
            websiteUrl: tmdbData.websiteUrl || prev.websiteUrl,
          }));
        } catch (err) {
          console.error('Failed to auto-sync with TMDb:', err);
        }
      };
      
      // Small delay to ensure form is ready
      setTimeout(autoSync, 200);
    }
  }, [isOpen, tmdbId, movie, formData.movieTmdbId]);

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

  // TMDb sync function
  const handleSyncWithTMDb = async () => {
    if (!formData.movieTmdbId) {
      setErrors({ movieTmdbId: 'TMDb ID is required for syncing' });
      return;
    }

    if (formData.excludeFromTmdbSync) {
      setErrors({ excludeFromTmdbSync: 'This movie is excluded from TMDb syncing. Uncheck the option to sync.' });
      return;
    }

    setSyncing(true);
    try {
      // Get fresh data from TMDb
      const tmdbResponse = await fetch(`/api/tmdb/movie/${formData.movieTmdbId}`);
      if (!tmdbResponse.ok) {
        throw new Error('Failed to fetch data from TMDb');
      }

      const tmdbData = await tmdbResponse.json();

      // Update form data with TMDb data, keeping any existing data for empty fields
      setFormData(prev => ({
        ...prev,
        movieTitle: tmdbData.title || prev.movieTitle,
        movieOriginalTitle: tmdbData.originalTitle || prev.movieOriginalTitle,
        movieYear: tmdbData.year || prev.movieYear,
        movieReleaseDate: tmdbData.releaseDate ? tmdbData.releaseDate.split('T')[0] : prev.movieReleaseDate,
        movieRuntime: tmdbData.runtime || prev.movieRuntime,
        movieTagline: tmdbData.tagline || prev.movieTagline,
        movieOverview: tmdbData.overview || prev.movieOverview,
        movieBudget: tmdbData.budget?.toString() || prev.movieBudget,
        movieBoxOffice: tmdbData.boxOffice?.toString() || prev.movieBoxOffice,
        moviePoster: tmdbData.poster || prev.moviePoster,
        movieBackdrop: tmdbData.backdrop || prev.movieBackdrop,
        movieTrailer: tmdbData.trailer || prev.movieTrailer,
        movieTmdbUrl: tmdbData.tmdbUrl || prev.movieTmdbUrl,
        movieTmdbRating: tmdbData.rating?.toString() || prev.movieTmdbRating,
        movieTmdbVotes: tmdbData.voteCount?.toString() || prev.movieTmdbVotes,
        movieImdbId: tmdbData.imdbId || prev.movieImdbId,
        movieImdbUrl: tmdbData.imdbUrl || prev.movieImdbUrl,
        movieActors: tmdbData.cast || prev.movieActors,
        movieDirectors: tmdbData.directors || prev.movieDirectors,
        movieWriters: tmdbData.writers || prev.movieWriters,
        movieGenres: tmdbData.genres || prev.movieGenres,
        movieCountries: tmdbData.productionCountries || prev.movieCountries,
        movieLanguages: tmdbData.spokenLanguages || prev.movieLanguages,
        movieStudios: tmdbData.productionCompanies || prev.movieStudios,
        
        // 🚀 NEW: Enhanced data from OMDb dual-API enrichment
        movieContentRating: tmdbData.contentRating || prev.movieContentRating,
        rottenTomatoesRating: tmdbData.rottenTomatoesRating || prev.rottenTomatoesRating,
        rottenTomatoesUrl: tmdbData.rottenTomatoesUrl || prev.rottenTomatoesUrl,
        imdbRating: tmdbData.imdbRating || prev.imdbRating,
        imdbVotes: tmdbData.imdbVotes || prev.imdbVotes,
        metacriticRating: tmdbData.metacriticRating || prev.metacriticRating,
        awards: tmdbData.awards || prev.awards,
        websiteUrl: tmdbData.websiteUrl || prev.websiteUrl,
      }));

      // Clear any TMDb sync errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.movieTmdbId;
        delete newErrors.excludeFromTmdbSync;
        return newErrors;
      });

    } catch (error) {
      console.error('TMDb sync error:', error);
      setErrors({ movieTmdbId: 'Failed to sync with TMDb: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setSyncing(false);
    }
  };

  // OMDb sync function for IMDb ID
  const handleSyncWithOMDb = async () => {
    if (!formData.movieImdbId) {
      setErrors({ movieImdbId: 'IMDb ID is required for OMDb syncing' });
      return;
    }

    setSyncingOmdb(true);
    try {
      // Get data from OMDb using IMDb ID
      const response = await fetch(`/api/tmdb/omdb/movie/${formData.movieImdbId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data from OMDb');
      }

      const omdbData = await response.json();

      // Update form data with OMDb data, keeping existing data for empty fields
      setFormData(prev => ({
        ...prev,
        // Basic info (prefer OMDb if available)
        movieTitle: omdbData.title || prev.movieTitle,
        movieYear: omdbData.year || prev.movieYear,
        movieReleaseDate: omdbData.releaseDate || prev.movieReleaseDate,
        movieRuntime: omdbData.runtime || prev.movieRuntime,
        movieOverview: omdbData.plot || prev.movieOverview,
        movieContentRating: omdbData.contentRating || prev.movieContentRating,
        moviePoster: omdbData.poster || prev.moviePoster,
        
        // Cast and crew (merge arrays, preferring OMDb data)
        movieDirectors: omdbData.directors && omdbData.directors.length > 0 ? omdbData.directors : prev.movieDirectors,
        movieWriters: omdbData.writers && omdbData.writers.length > 0 ? omdbData.writers : prev.movieWriters,
        movieActors: omdbData.actors && omdbData.actors.length > 0 ? omdbData.actors : prev.movieActors,
        
        // Categories (merge arrays, preferring OMDb data)
        movieGenres: omdbData.genres && omdbData.genres.length > 0 ? omdbData.genres : prev.movieGenres,
        movieCountries: omdbData.countries && omdbData.countries.length > 0 ? omdbData.countries : prev.movieCountries,
        movieLanguages: omdbData.languages && omdbData.languages.length > 0 ? omdbData.languages : prev.movieLanguages,
        movieStudios: omdbData.studios && omdbData.studios.length > 0 ? omdbData.studios : prev.movieStudios,
        
        // Enhanced OMDb-specific data
        rottenTomatoesRating: omdbData.rottenTomatoesRating || prev.rottenTomatoesRating,
        rottenTomatoesUrl: omdbData.rottenTomatoesUrl || prev.rottenTomatoesUrl,
        imdbRating: omdbData.imdbRating || prev.imdbRating,
        imdbVotes: omdbData.imdbVotes || prev.imdbVotes,
        metacriticRating: omdbData.metacriticRating || prev.metacriticRating,
        awards: omdbData.awards || prev.awards,
        websiteUrl: omdbData.websiteUrl || prev.websiteUrl,
        
        // Box office (prefer OMDb if available)
        movieBoxOffice: omdbData.boxOffice || prev.movieBoxOffice,
      }));

      // Clear any OMDb sync errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.movieImdbId;
        return newErrors;
      });

      console.log('✅ OMDb sync completed successfully');

    } catch (error) {
      console.error('OMDb sync error:', error);
      setErrors({ movieImdbId: 'Failed to sync with OMDb: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setSyncingOmdb(false);
    }
  };

  // Selective OMDb sync function - only fills missing fields
  const handleSelectiveOMDbSync = async () => {
    if (!formData.movieImdbId) {
      setErrors({ movieImdbId: 'IMDb ID is required for OMDb syncing' });
      return;
    }

    setSyncingOmdbSelective(true);
    try {
      // Get data from OMDb using IMDb ID
      const response = await fetch(`/api/tmdb/omdb/movie/${formData.movieImdbId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data from OMDb');
      }

      const omdbData = await response.json();

      // Helper function to check if a field is empty/missing
      const isEmpty = (value: any): boolean => {
        if (value === null || value === undefined || value === '') return true;
        if (Array.isArray(value) && value.length === 0) return true;
        return false;
      };

      // Update form data - ONLY fill fields that are currently empty
      setFormData(prev => ({
        ...prev,
        // Basic info - only fill if empty
        movieTitle: isEmpty(prev.movieTitle) && omdbData.title ? omdbData.title : prev.movieTitle,
        movieYear: isEmpty(prev.movieYear) && omdbData.year ? omdbData.year : prev.movieYear,
        movieReleaseDate: isEmpty(prev.movieReleaseDate) && omdbData.releaseDate ? omdbData.releaseDate : prev.movieReleaseDate,
        movieRuntime: isEmpty(prev.movieRuntime) && omdbData.runtime ? omdbData.runtime : prev.movieRuntime,
        movieOverview: isEmpty(prev.movieOverview) && omdbData.plot ? omdbData.plot : prev.movieOverview,
        movieContentRating: isEmpty(prev.movieContentRating) && omdbData.contentRating ? omdbData.contentRating : prev.movieContentRating,
        moviePoster: isEmpty(prev.moviePoster) && omdbData.poster ? omdbData.poster : prev.moviePoster,
        
        // Cast and crew - only fill if empty
        movieDirectors: isEmpty(prev.movieDirectors) && omdbData.directors ? omdbData.directors : prev.movieDirectors,
        movieWriters: isEmpty(prev.movieWriters) && omdbData.writers ? omdbData.writers : prev.movieWriters,
        movieActors: isEmpty(prev.movieActors) && omdbData.actors ? omdbData.actors : prev.movieActors,
        
        // Categories - only fill if empty
        movieGenres: isEmpty(prev.movieGenres) && omdbData.genres ? omdbData.genres : prev.movieGenres,
        movieCountries: isEmpty(prev.movieCountries) && omdbData.countries ? omdbData.countries : prev.movieCountries,
        movieLanguages: isEmpty(prev.movieLanguages) && omdbData.languages ? omdbData.languages : prev.movieLanguages,
        movieStudios: isEmpty(prev.movieStudios) && omdbData.studios ? omdbData.studios : prev.movieStudios,
        
        // Enhanced OMDb-specific data - only fill if empty
        rottenTomatoesRating: isEmpty(prev.rottenTomatoesRating) && omdbData.rottenTomatoesRating ? omdbData.rottenTomatoesRating : prev.rottenTomatoesRating,
        rottenTomatoesUrl: isEmpty(prev.rottenTomatoesUrl) && omdbData.rottenTomatoesUrl ? omdbData.rottenTomatoesUrl : prev.rottenTomatoesUrl,
        imdbRating: isEmpty(prev.imdbRating) && omdbData.imdbRating ? omdbData.imdbRating : prev.imdbRating,
        imdbVotes: isEmpty(prev.imdbVotes) && omdbData.imdbVotes ? omdbData.imdbVotes : prev.imdbVotes,
        metacriticRating: isEmpty(prev.metacriticRating) && omdbData.metacriticRating ? omdbData.metacriticRating : prev.metacriticRating,
        awards: isEmpty(prev.awards) && omdbData.awards ? omdbData.awards : prev.awards,
        websiteUrl: isEmpty(prev.websiteUrl) && omdbData.websiteUrl ? omdbData.websiteUrl : prev.websiteUrl,
        
        // Box office - only fill if empty
        movieBoxOffice: isEmpty(prev.movieBoxOffice) && omdbData.boxOffice ? omdbData.boxOffice : prev.movieBoxOffice,
      }));

      // Clear any OMDb sync errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.movieImdbId;
        return newErrors;
      });

      console.log('✅ Selective OMDb sync completed - only filled missing fields');

    } catch (error) {
      console.error('Selective OMDb sync error:', error);
      setErrors({ movieImdbId: 'Failed to sync with OMDb: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setSyncingOmdbSelective(false);
    }
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

      // Convert empty strings to null for optional fields
      const fieldsToNullify = [
        'movieOriginalTitle', 'movieTagline', 'movieBudget', 'movieBoxOffice',
        'moviePoster', 'movieBackdrop', 'movieTrailer', 'movieTmdbId', 
        'movieTmdbUrl', 'movieTmdbRating', 'movieTmdbVotes', 'movieImdbId', 
        'movieImdbUrl', 'movieAmazonLink', 'movieContentRating'
      ];

      fieldsToNullify.forEach(field => {
        if (cleanData[field as keyof MovieFormData] === '') {
          (cleanData as any)[field] = null;
        }
      });

      console.log('🐛 DEBUG: Form data before processing:', formData);
      console.log('🐛 DEBUG: Clean data before array processing:', cleanData);

      // Handle arrays - convert empty arrays to null, ensure arrays are arrays
      const arrayFields = ['movieActors', 'movieDirectors', 'movieWriters', 'movieGenres', 'movieCountries', 'movieLanguages', 'movieStudios'];
      arrayFields.forEach(field => {
        const value = cleanData[field as keyof MovieFormData];
        console.log(`🐛 DEBUG: Processing ${field}:`, typeof value, value);
        
        // If it's a string, convert to array (split by comma)
        if (typeof value === 'string') {
          if (value.trim() === '') {
            (cleanData as any)[field] = null;
            console.log(`🐛 DEBUG: Set ${field} to null (empty string)`);
          } else {
            (cleanData as any)[field] = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
            console.log(`🐛 DEBUG: Converted ${field} to array:`, (cleanData as any)[field]);
          }
        }
        // If it's already an array
        else if (Array.isArray(value)) {
          if (value.length === 0) {
            (cleanData as any)[field] = null;
            console.log(`🐛 DEBUG: Set ${field} to null (empty array)`);
          }
        }
        // If it's neither string nor array, set to null
        else {
          (cleanData as any)[field] = null;
          console.log(`🐛 DEBUG: Set ${field} to null (not string or array)`);
        }
      });

      console.log('🐛 DEBUG: Final clean data being sent to API:', cleanData);

      // Handle date field - keep as pure date string without timezone conversion
      if (cleanData.movieReleaseDate === '') {
        (cleanData as any).movieReleaseDate = null;
      }
      // Keep the date string as-is to avoid timezone conversion issues

      await onSave(cleanData);
      
      // Save experiment changes for edit mode
      if (isEditMode && (experimentChanges.toAdd.length > 0 || experimentChanges.toRemove.length > 0)) {
        await saveExperimentChanges();
      }
      
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

  const handleInputChange = (field: keyof MovieFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Experiment management functions
  const handleExperimentToggle = (experimentId: number) => {
    const isCurrentlyLinked = movieExperiments.includes(experimentId);
    const wasOriginallyLinked = isEditMode && movie?.movieExperiments?.some(me => me.experimentId === experimentId);
    
    if (isCurrentlyLinked) {
      // Remove from current experiments
      setMovieExperiments(prev => prev.filter(id => id !== experimentId));
      
      // Track changes for API calls
      if (wasOriginallyLinked) {
        // Was originally linked, now removing - add to toRemove
        setExperimentChanges(prev => ({
          toAdd: prev.toAdd.filter(id => id !== experimentId),
          toRemove: [...prev.toRemove.filter(id => id !== experimentId), experimentId]
        }));
      } else {
        // Was added in this session, now removing - remove from toAdd
        setExperimentChanges(prev => ({
          ...prev,
          toAdd: prev.toAdd.filter(id => id !== experimentId)
        }));
      }
    } else {
      // Add to current experiments
      setMovieExperiments(prev => [...prev, experimentId]);
      
      // Track changes for API calls
      if (wasOriginallyLinked) {
        // Was originally linked, was removed, now adding back - remove from toRemove
        setExperimentChanges(prev => ({
          ...prev,
          toRemove: prev.toRemove.filter(id => id !== experimentId)
        }));
      } else {
        // Was not originally linked, now adding - add to toAdd
        setExperimentChanges(prev => ({
          toAdd: [...prev.toAdd.filter(id => id !== experimentId), experimentId],
          toRemove: prev.toRemove.filter(id => id !== experimentId)
        }));
      }
    }
  };

  const saveExperimentChanges = async () => {
    if (!isEditMode || !movie) {
      return;
    }

    try {
      const promises: Promise<any>[] = [];
      
      // Link new experiments
      for (const experimentId of experimentChanges.toAdd) {
        promises.push(apiService.linkMovieToExperiment(experimentId, movie.id));
      }
      
      // Unlink removed experiments
      for (const experimentId of experimentChanges.toRemove) {
        promises.push(apiService.unlinkMovieFromExperiment(experimentId, movie.id));
      }
      
      await Promise.all(promises);
      
      // Reset changes tracking
      setExperimentChanges({ toAdd: [], toRemove: [] });
    } catch (error) {
      console.error('Failed to save experiment changes:', error);
      throw error;
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'details', label: 'Details', icon: '📊' },
    { id: 'people', label: 'Cast & Crew', icon: '👥' },
    { id: 'experiments', label: 'Experiments', icon: '🧪' },
    { id: 'admin', label: 'Admin', icon: '⚙️' },
    { id: 'affiliate', label: 'Affiliate Links', icon: '🔗' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
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

        <form 
          key={`form-${isEditMode ? movie?.id : 'new'}`}
          onSubmit={handleSubmit} 
          className="overflow-y-auto max-h-[calc(90vh-200px)]"
        >
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
                      value={String(formData.movieTitle ?? '')}
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
                      value={String(formData.movieOriginalTitle || '')}
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
                      value={String(formData.movieYear || '')}
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
                      value={String(formData.movieReleaseDate || '')}
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
                      value={String(formData.movieRuntime || '')}
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
                      value={String(formData.movieContentRating || '')}
                      onChange={(e) => handleInputChange('movieContentRating', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select rating</option>
                      <option value="G">G</option>
                      <option value="PG">PG</option>
                      <option value="PG-13">PG-13</option>
                      <option value="R">R</option>
                      <option value="NC-17">NC-17</option>
                      <option value="X">X</option>
                      <option value="NR">Not Rated</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Poster URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Poster URL
                    </label>
                    <input
                      type="url"
                      value={String(formData.moviePoster || '')}
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
                      value={String(formData.movieOverview || '')}
                      onChange={(e) => handleInputChange('movieOverview', e.target.value)}
                      rows={4}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Movie plot summary..."
                    />
                  </div>
                </div>

                {/* OMDb Enhanced Ratings Section */}
                <div className="pt-6 border-t border-dark-600">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📊 Enhanced Ratings & Awards
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TMDb Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          TMDb Rating
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">TMDb</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={String(formData.movieTmdbRating || '')}
                        onChange={(e) => handleInputChange('movieTmdbRating', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="7.5"
                      />
                    </div>

                    {/* TMDb Votes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          TMDb Votes
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">TMDb</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={String(formData.movieTmdbVotes || '')}
                        onChange={(e) => handleInputChange('movieTmdbVotes', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="1500"
                      />
                    </div>

                    {/* Enhanced IMDb Rating (from OMDb) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          IMDb Rating
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Enhanced</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={String(formData.imdbRating || '')}
                        onChange={(e) => handleInputChange('imdbRating', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="8.1"
                      />
                    </div>

                    {/* IMDb Votes (Enhanced) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          IMDb Votes
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Enhanced</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={String(formData.imdbVotes || '')}
                        onChange={(e) => handleInputChange('imdbVotes', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="150,000"
                      />
                    </div>

                    {/* Rotten Tomatoes Rating (from OMDb) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          🍅 Rotten Tomatoes Rating
                          <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">OMDb</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={String(formData.rottenTomatoesRating || '')}
                        onChange={(e) => handleInputChange('rottenTomatoesRating', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="75%"
                      />
                    </div>

                    {/* Metacritic Rating (from OMDb) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          📊 Metacritic Rating
                          <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">OMDb</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={String(formData.metacriticRating || '')}
                        onChange={(e) => handleInputChange('metacriticRating', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="68/100"
                      />
                    </div>
                  </div>

                  {/* Awards (from OMDb) - Full width */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        🏆 Awards
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">OMDb</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={String(formData.awards || '')}
                      onChange={(e) => handleInputChange('awards', e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Won 3 Oscars. Another 15 wins & 20 nominations."
                    />
                  </div>
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
                    value={String(formData.movieTagline || '')}
                    onChange={(e) => handleInputChange('movieTagline', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Catchy movie tagline"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Budget
                    </label>
                    <input
                      type="text"
                      value={String(formData.movieBudget || '')}
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
                      value={String(formData.movieBoxOffice || '')}
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

                {/* External Links Section */}
                <div className="pt-6 border-t border-dark-600">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    🔗 External Links
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* TMDb URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        TMDb URL
                      </label>
                      <input
                        type="url"
                        value={String(formData.movieTmdbUrl || '')}
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
                        value={String(formData.movieImdbUrl || '')}
                        onChange={(e) => handleInputChange('movieImdbUrl', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://www.imdb.com/title/tt1234567"
                      />
                    </div>

                    {/* Rotten Tomatoes URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        🍅 Rotten Tomatoes URL
                      </label>
                      <input
                        type="url"
                        value={String(formData.rottenTomatoesUrl || '')}
                        onChange={(e) => handleInputChange('rottenTomatoesUrl', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://www.rottentomatoes.com/m/movie_title"
                      />
                    </div>

                    {/* Website URL (from OMDb) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          🌐 Official Website
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">OMDb</span>
                        </span>
                      </label>
                      <input
                        type="url"
                        value={String(formData.websiteUrl || '')}
                        onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://www.moviewebsite.com"
                      />
                    </div>

                    {/* Trailer URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Trailer URL
                      </label>
                      <input
                        type="url"
                        value={String(formData.movieTrailer || '')}
                        onChange={(e) => handleInputChange('movieTrailer', e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                  </div>
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

            {/* Experiments Tab */}
            {activeTab === 'experiments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Movie Experiments</h3>
                  <span className="text-sm text-gray-400">
                    {movieExperiments.length} experiment{movieExperiments.length !== 1 ? 's' : ''} linked
                  </span>
                </div>

                {!isEditMode && (
                  <div className="bg-blue-900 border border-blue-700 text-blue-100 px-4 py-3 rounded-lg">
                    <p className="text-sm">
                      📝 Experiment linking is only available when editing existing movies. Save the movie first, then edit it to manage experiments.
                    </p>
                  </div>
                )}

                {isEditMode && (
                  <>
                    {/* Currently Linked Experiments */}
                    {movieExperiments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-md font-medium text-white">Currently Linked Experiments</h4>
                        <div className="space-y-2">
                          {movieExperiments.map(experimentId => {
                            const experiment = availableExperiments.find(e => e.id === experimentId);
                            if (!experiment) return null;
                            
                            const isChanged = experimentChanges.toRemove.includes(experimentId);
                            
                            return (
                              <div
                                key={experimentId}
                                className={`bg-green-900 border border-green-700 rounded-lg p-3 flex items-center justify-between ${
                                  isChanged ? 'ring-2 ring-yellow-500 opacity-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-4 h-4 bg-green-500 border-green-500 rounded border-2 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-white font-medium">
                                      Experiment #{experiment.experimentNumber}
                                    </p>
                                    <p className="text-green-200 text-sm">
                                      {new Date(experiment.eventDate).toLocaleDateString()} - {experiment.eventHost} at {experiment.eventLocation}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isChanged && (
                                    <span className="text-yellow-400 text-xs px-2 py-1 bg-yellow-900 rounded">
                                      Will Remove
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleExperimentToggle(experimentId)}
                                    className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                                    title="Remove experiment"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add New Experiments */}
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-white">Add Experiments</h4>
                      
                      {/* Search Box */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Search by experiment number (e.g., 001, 042)..."
                          value={experimentSearch}
                          onChange={(e) => setExperimentSearch(e.target.value)}
                          className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        
                        {/* Search Results */}
                        {experimentSearch && (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {filteredExperiments.length === 0 ? (
                              <div className="text-gray-400 text-sm p-3 bg-dark-700 rounded-lg">
                                No experiments found matching "{experimentSearch}"
                              </div>
                            ) : (
                              filteredExperiments.map(experiment => {
                                const isLinked = movieExperiments.includes(experiment.id);
                                const isChanged = experimentChanges.toAdd.includes(experiment.id);
                                
                                // Don't show experiments that are already linked (unless they're being removed)
                                if (isLinked && !experimentChanges.toRemove.includes(experiment.id)) {
                                  return null;
                                }
                                
                                return (
                                  <div
                                    key={experiment.id}
                                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:bg-dark-600 ${
                                      isChanged 
                                        ? 'bg-green-900 border-green-700 ring-2 ring-yellow-500' 
                                        : 'bg-dark-700 border-dark-600'
                                    }`}
                                    onClick={() => handleExperimentToggle(experiment.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                          isChanged 
                                            ? 'bg-green-500 border-green-500' 
                                            : 'border-gray-500'
                                        }`}>
                                          {isChanged && (
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-white font-medium">
                                            Experiment #{experiment.experimentNumber}
                                          </p>
                                          <p className="text-gray-400 text-sm">
                                            {new Date(experiment.eventDate).toLocaleDateString()} - {experiment.eventHost} at {experiment.eventLocation}
                                          </p>
                                        </div>
                                      </div>
                                      {isChanged && (
                                        <span className="text-yellow-400 text-xs px-2 py-1 bg-yellow-900 rounded">
                                          Will Add
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pending Changes Summary */}
                    {(experimentChanges.toAdd.length > 0 || experimentChanges.toRemove.length > 0) && (
                      <div className="bg-yellow-900 border border-yellow-700 text-yellow-100 px-4 py-3 rounded-lg">
                        <p className="text-sm font-medium mb-2">Pending Changes:</p>
                        <ul className="text-sm space-y-1">
                          {experimentChanges.toAdd.map(id => {
                            const exp = availableExperiments.find(e => e.id === id);
                            return (
                              <li key={`add-${id}`} className="flex items-center gap-2">
                                <span className="text-green-400">+</span>
                                Link to Experiment #{exp?.experimentNumber}
                              </li>
                            );
                          })}
                          {experimentChanges.toRemove.map(id => {
                            const exp = availableExperiments.find(e => e.id === id);
                            return (
                              <li key={`remove-${id}`} className="flex items-center gap-2">
                                <span className="text-red-400">-</span>
                                Unlink from Experiment #{exp?.experimentNumber}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && (
              <div className="space-y-6">
                {/* API IDs and Sync */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">API Integration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TMDb ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        TMDb ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={String(formData.movieTmdbId || '')}
                          onChange={(e) => handleInputChange('movieTmdbId', e.target.value)}
                          className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="123456"
                        />
                        {formData.movieTmdbId && (
                          <button
                            type="button"
                            onClick={handleSyncWithTMDb}
                            disabled={loading || syncing}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded transition-colors flex items-center gap-1"
                            title="Sync with TMDb"
                          >
                            {syncing ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <span>🔄</span>
                            )}
                          </button>
                        )}
                      </div>
                      {errors.movieTmdbId && (
                        <p className="text-red-400 text-sm mt-1">{errors.movieTmdbId}</p>
                      )}
                    </div>

                    {/* IMDb ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        IMDb ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={String(formData.movieImdbId || '')}
                          onChange={(e) => handleInputChange('movieImdbId', e.target.value)}
                          className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="tt1234567"
                        />
                        {formData.movieImdbId && (
                          <button
                            type="button"
                            onClick={handleSyncWithOMDb}
                            disabled={loading || syncingOmdb}
                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded transition-colors flex items-center gap-1"
                            title="Sync with OMDb (Rotten Tomatoes, Awards, etc.)"
                          >
                            {syncingOmdb ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <span>🍅</span>
                            )}
                          </button>
                        )}
                      </div>
                      {errors.movieImdbId && (
                        <p className="text-red-400 text-sm mt-1">{errors.movieImdbId}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* OMDb Sync Section */}
                <div className="bg-dark-800 p-4 rounded-lg border border-dark-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium mb-1">Fill Missing Data with OMDb</h4>
                      <p className="text-gray-400 text-sm">Only fills empty fields with OMDb data - won't overwrite existing content</p>
                    </div>
                    {formData.movieImdbId && (
                      <button
                        type="button"
                        onClick={handleSelectiveOMDbSync}
                        disabled={loading || syncingOmdbSelective || syncing || syncingOmdb}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                        title="Fill missing fields with OMDb data (requires IMDb ID)"
                      >
                        {syncingOmdbSelective ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <span>🔍</span>
                        )}
                        <span className="text-sm">Fill Missing</span>
                      </button>
                    )}
                    {!formData.movieImdbId && (
                      <div className="text-gray-500 text-sm italic">
                        Requires IMDb ID above
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Admin Settings</h3>
                  
                  {/* Exclude from TMDb Sync */}
                  <div className="bg-dark-600 p-4 rounded-lg border border-orange-500">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.excludeFromTmdbSync || false}
                        onChange={(e) => handleInputChange('excludeFromTmdbSync', e.target.checked)}
                        className="w-4 h-4 text-orange-500 bg-dark-700 border-dark-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <div>
                        <span className="text-sm font-medium text-orange-300">
                          Exclude from TMDb syncing
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          Check this box to prevent TMDb from overwriting this movie's data. Useful for obscure movies not in TMDb.
                        </p>
                      </div>
                    </label>
                    {errors.excludeFromTmdbSync && (
                      <p className="text-red-400 text-sm mt-2">{errors.excludeFromTmdbSync}</p>
                    )}
                  </div>

                  {/* 3D Movie Toggle */}
                  <div className="bg-dark-600 p-4 rounded-lg border border-cyan-500">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.shown3D || false}
                        onChange={(e) => handleInputChange('shown3D', e.target.checked)}
                        className="w-4 h-4 text-cyan-500 bg-dark-700 border-dark-600 rounded focus:ring-cyan-500 focus:ring-2"
                      />
                      <div>
                        <span className="text-sm font-medium text-cyan-300">
                          3D Movie
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          Mark this movie as being shown in 3D format. This will display a glowing 3D indicator on the movie card.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Affiliate Links Tab */}
            {activeTab === 'affiliate' && (
              <div className="space-y-6">
                {/* Amazon Affiliate Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      🛒 Amazon Affiliate Link
                      <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Revenue</span>
                    </span>
                  </label>
                  <input
                    type="url"
                    value={String(formData.movieAmazonLink || '')}
                    onChange={(e) => handleInputChange('movieAmazonLink', e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://amazon.com/..."
                  />
                  <p className="text-gray-400 text-sm mt-2">
                    Add your Amazon affiliate link here. This will generate commission for purchases made through this link.
                  </p>
                </div>

                {/* Future Affiliate Links */}
                <div className="bg-dark-800 p-4 rounded-lg border border-dark-600">
                  <h4 className="text-white font-medium mb-2">Future Affiliate Programs</h4>
                  <p className="text-gray-400 text-sm mb-3">
                    Additional affiliate link options will be added here as the portal grows:
                  </p>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• iTunes/Apple TV affiliate links</li>
                    <li>• Google Play Movies affiliate links</li>
                    <li>• Vudu affiliate links</li>
                    <li>• Target/Best Buy physical media links</li>
                    <li>• Streaming service referral links</li>
                  </ul>
                  <p className="text-gray-500 text-xs mt-3 italic">
                    These features will be implemented as the portal scales and additional revenue streams are established.
                  </p>
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
          <div className="flex justify-between items-center p-6 border-t border-dark-600 bg-dark-700">
            {/* Left side - TMDb sync button (only in edit mode) */}
            <div>
              {isEditMode && formData.movieTmdbId && (
                <button
                  type="button"
                  onClick={handleSyncWithTMDb}
                  disabled={loading || syncing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded transition-colors flex items-center gap-2"
                >
                  {syncing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Syncing with TMDb...
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      Sync with TMDb
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right side - Cancel and Save buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
                disabled={loading || syncing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded transition-colors disabled:opacity-50"
                disabled={loading || syncing}
              >
                {loading ? 'Saving...' : (isEditMode ? 'Update Movie' : 'Add Movie')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
