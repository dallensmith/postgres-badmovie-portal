import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { ExperimentFilters } from '../components/ExperimentFilters';
import { Pagination } from '../components/Pagination';
import { MovieGridSkeleton } from '../components/LoadingStates';

interface Experiment {
  id: number;
  experimentNumber: string;
  eventDate: string;
  eventHost: string;
  eventLocation: string;
  eventEncore: boolean;
  eventNotes: string | null;
  eventAttendees: string | null;
  eventImage: string | null;
  postUrl: string | null;
  movieExperiments?: Array<{
    isEncore?: boolean;
    movie: {
      id: number;
      movieTitle: string;
      moviePoster: string | null;
      movieYear: string | null;
    };
  }>;
}

interface NewExperiment {
  experimentNumber: string;
  eventDate: string;
  eventHost: string;
  eventLocation: string;
  eventEncore: boolean;
  eventNotes: string;
  eventImage: string;
  postUrl: string;
}

interface ExperimentsResponse {
  experiments: Experiment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function Experiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
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
  
  // Filters - matching movies page pattern
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Available years for filtering
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(null);

  const [newExperiment, setNewExperiment] = useState<NewExperiment>({
    experimentNumber: '',
    eventDate: '',
    eventHost: '',
    eventLocation: '',
    eventEncore: false,
    eventNotes: '',
    eventImage: '',
    postUrl: ''
  });

  // Fetch experiments with current filters
  const fetchExperiments = useCallback(async () => {
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

      const response = await fetch(`/api/experiments?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExperimentsResponse = await response.json();
      setExperiments(data.experiments || []);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.pages,
        hasNext: data.pagination.page < data.pagination.pages,
        hasPrev: data.pagination.page > 1
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch experiments');
      console.error('Error fetching experiments:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, selectedYear, sortBy, sortOrder]);

  // Fetch available years for filtering
  const fetchYears = useCallback(async () => {
    try {
      const response = await fetch('/api/experiments/years');
      if (response.ok) {
        const years = await response.json();
        setAvailableYears(years);
      }
    } catch (err) {
      console.error('Error fetching years:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  // Fetch experiments when filters change
  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchExperiments();
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
    setSortBy('date');
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

  const handleCreateExperiment = async () => {
    try {
      await apiService.createExperiment(newExperiment);
      setShowCreateModal(false);
      setNewExperiment({
        experimentNumber: '',
        eventDate: '',
        eventHost: '',
        eventLocation: '',
        eventEncore: false,
        eventNotes: '',
        eventImage: '',
        postUrl: ''
      });
      await fetchExperiments();
    } catch (error) {
      console.error('Failed to create experiment:', error);
    }
  };

  const handleEditExperiment = async () => {
    if (!editingExperiment) return;
    
    try {
      await apiService.updateExperiment(editingExperiment.id, {
        experimentNumber: editingExperiment.experimentNumber,
        eventDate: editingExperiment.eventDate,
        eventHost: editingExperiment.eventHost,
        eventLocation: editingExperiment.eventLocation,
        eventEncore: editingExperiment.eventEncore,
        eventNotes: editingExperiment.eventNotes,
        eventImage: editingExperiment.eventImage,
        postUrl: editingExperiment.postUrl
      });
      setEditingExperiment(null);
      await fetchExperiments();
    } catch (error) {
      console.error('Failed to update experiment:', error);
    }
  };

  const handleDeleteExperiment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this experiment? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiService.deleteExperiment(id);
      await fetchExperiments();
    } catch (error) {
      console.error('Failed to delete experiment:', error);
    }
  };

  // Stats calculations using the current page's experiments
  const totalMoviesOnPage = experiments.reduce((sum, exp) => sum + (exp.movieExperiments?.length || 0), 0);
  const totalEncoresOnPage = experiments.reduce((sum, exp) => 
    sum + (exp.movieExperiments?.filter(me => me.isEncore).length || 0), 0);

  const getNextExperimentNumber = () => {
    if (experiments.length === 0) return '001';
    const maxNumber = Math.max(...experiments.map(exp => parseInt(exp.experimentNumber) || 0));
    return String(maxNumber + 1).padStart(3, '0');
  };

  if (loading) {
    return <MovieGridSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">Error loading experiments</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={fetchExperiments}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Experiments</h1>
          <p className="text-gray-400 mt-1">Manage movie viewing experiments and events</p>
        </div>
        <button
          onClick={() => {
            setNewExperiment(prev => ({ ...prev, experimentNumber: getNextExperimentNumber() }));
            setShowCreateModal(true);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>➕</span>
          Create Experiment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">{pagination.total}</div>
          <div className="text-gray-400">Total Experiments</div>
        </div>
        <div className="bg-dark-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">{totalMoviesOnPage}</div>
          <div className="text-gray-400">Movies on Page</div>
        </div>
        <div className="bg-dark-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">{totalEncoresOnPage}</div>
          <div className="text-gray-400">Encores on Page</div>
        </div>
      </div>

      {/* Search and Filters */}
      <ExperimentFilters
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

      {/* Experiments Grid */}
      {experiments.length === 0 ? (
        <div className="bg-dark-800 p-8 rounded-lg text-center">
          <div className="text-gray-400 text-lg">
            {searchQuery ? 'No experiments found matching your search.' : 'No experiments created yet.'}
          </div>
          {!searchQuery && (
            <button
              onClick={() => {
                setNewExperiment(prev => ({ ...prev, experimentNumber: getNextExperimentNumber() }));
                setShowCreateModal(true);
              }}
              className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create Your First Experiment
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {experiments.map(experiment => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onEdit={setEditingExperiment}
                onDelete={handleDeleteExperiment}
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

      {/* Create/Edit Modal */}
      {(showCreateModal || editingExperiment) && (
        <ExperimentModal
          experiment={editingExperiment}
          newExperiment={newExperiment}
          setNewExperiment={setNewExperiment}
          setEditingExperiment={setEditingExperiment}
          onSave={editingExperiment ? handleEditExperiment : handleCreateExperiment}
          onClose={() => {
            setShowCreateModal(false);
            setEditingExperiment(null);
          }}
        />
      )}
    </div>
  );
}

// Experiment Card Component
function ExperimentCard({ 
  experiment, 
  onEdit, 
  onDelete 
}: { 
  experiment: Experiment;
  onEdit: (exp: Experiment) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {experiment.eventImage && (
        <div className="h-48 overflow-hidden">
          <img 
            src={experiment.eventImage} 
            alt={`Experiment ${experiment.experimentNumber}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">#{experiment.experimentNumber}</h3>
            <p className="text-gray-400">{new Date(experiment.eventDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">👤</span>
            <span className="text-white">{experiment.eventHost}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📍</span>
            <span className="text-white">{experiment.eventLocation}</span>
          </div>
        </div>

        {experiment.eventNotes && (
          <div className="mb-4">
            <p className="text-gray-300 text-sm bg-dark-700 p-3 rounded">
              {experiment.eventNotes}
            </p>
          </div>
        )}

        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">
            Movies ({experiment.movieExperiments?.length || 0})
          </div>
          {experiment.movieExperiments && experiment.movieExperiments.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {experiment.movieExperiments.slice(0, 3).map((movieExp, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="bg-dark-700 text-xs px-2 py-1 rounded text-gray-300">
                    {movieExp.movie.movieTitle}
                  </span>
                  {movieExp.isEncore && (
                    <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded text-xs font-semibold">
                      ENCORE
                    </span>
                  )}
                </div>
              ))}
              {experiment.movieExperiments.length > 3 && (
                <span className="bg-dark-700 text-xs px-2 py-1 rounded text-gray-400">
                  +{experiment.movieExperiments.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">No movies linked</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.open(`/experiments/${experiment.id}`, '_blank')}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors text-sm"
          >
            View Details
          </button>
          <button
            onClick={() => onEdit(experiment)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(experiment.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition-colors text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Experiment Modal Component
function ExperimentModal({
  experiment,
  newExperiment,
  setNewExperiment,
  setEditingExperiment,
  onSave,
  onClose
}: {
  experiment: Experiment | null;
  newExperiment: NewExperiment;
  setNewExperiment: (exp: NewExperiment) => void;
  setEditingExperiment: (exp: Experiment | null) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const isEditing = !!experiment;
  const formData = isEditing ? experiment : newExperiment;

  const handleInputChange = (field: string, value: string | boolean) => {
    if (isEditing) {
      setEditingExperiment({ ...experiment!, [field]: value });
    } else {
      setNewExperiment({ ...newExperiment, [field]: value });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-dark-600">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Experiment' : 'Create New Experiment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl p-2"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Experiment Number *
              </label>
              <input
                type="text"
                value={formData.experimentNumber}
                onChange={(e) => handleInputChange('experimentNumber', e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Date *
              </label>
              <input
                type="date"
                value={formData.eventDate ? formData.eventDate.split('T')[0] : ''}
                onChange={(e) => handleInputChange('eventDate', e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Host *
              </label>
              <input
                type="text"
                value={formData.eventHost}
                onChange={(e) => handleInputChange('eventHost', e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Host name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.eventLocation}
                onChange={(e) => handleInputChange('eventLocation', e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Event location"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Image URL
              </label>
              <input
                type="url"
                value={formData.eventImage || ''}
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
                value={formData.postUrl || ''}
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
              value={formData.eventNotes || ''}
              onChange={(e) => handleInputChange('eventNotes', e.target.value)}
              rows={3}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Additional notes about the experiment"
            />
          </div>

        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-dark-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isEditing ? 'Update' : 'Create'} Experiment
          </button>
        </div>
      </div>
    </div>
  );
}
