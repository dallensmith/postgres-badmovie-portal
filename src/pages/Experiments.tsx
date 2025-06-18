import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExperimentCard, Experiment } from '../components/ExperimentCard';
import { SearchFilters } from '../components/SearchFilters';
import { Pagination } from '../components/Pagination';
import { MovieGridSkeleton } from '../components/LoadingStates';
import { apiService } from '../services/api';

interface NewExperiment {
  experimentNumber: string;
  eventDate: string;
  eventTime: string;
  eventTimezone: string;
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
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24, // Match Movies page default
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true); // Start true like Movies page for consistency
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
      setPagination(prev => ({
        ...prev,
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.pages,
        hasNext: data.pagination.page < data.pagination.pages,
        hasPrev: data.pagination.page > 1
      }));
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

  const handleCreateExperiment = useCallback(async () => {
    console.log('Create button clicked!');
    console.log('New experiment data:', JSON.stringify(newExperiment, null, 2));
    
    // Check for required fields
    if (!newExperiment.experimentNumber || !newExperiment.eventDate || !newExperiment.eventHost || !newExperiment.eventLocation) {
      console.error('Missing required fields:', {
        experimentNumber: newExperiment.experimentNumber,
        eventDate: newExperiment.eventDate,
        eventHost: newExperiment.eventHost,
        eventLocation: newExperiment.eventLocation
      });
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      console.log('Sending create request...');
      const result = await apiService.createExperiment(newExperiment);
      console.log('Create result:', result);
      setShowCreateModal(false);
      setNewExperiment({
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
        eventEncore: false,
        eventNotes: '',
        eventImage: '',
        postUrl: ''
      });
      fetchExperiments();
    } catch (error) {
      console.error('Failed to create experiment:', error);
      alert('Failed to create experiment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [newExperiment, fetchExperiments]);

  const handleEditExperiment = useCallback(async () => {
    if (!editingExperiment) return;
    
    try {
      await apiService.updateExperiment(editingExperiment.id, {
        experimentNumber: editingExperiment.experimentNumber,
        eventDate: editingExperiment.eventDate,
        eventTime: editingExperiment.eventTime,
        eventTimezone: editingExperiment.eventTimezone,
        eventHost: editingExperiment.eventHost,
        eventLocation: editingExperiment.eventLocation,
        eventEncore: editingExperiment.eventEncore,
        eventNotes: editingExperiment.eventNotes,
        eventImage: editingExperiment.eventImage,
        postUrl: editingExperiment.postUrl
      });
      setEditingExperiment(null);
      fetchExperiments();
    } catch (error) {
      console.error('Failed to update experiment:', error);
    }
  }, [editingExperiment, fetchExperiments]);

  const handleDeleteExperiment = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this experiment? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiService.deleteExperiment(id);
      // Immediately remove from local state for instant UI feedback
      setExperiments(prev => prev.filter(exp => exp.id !== id));
      // Update pagination total
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      // Then refresh from server to ensure consistency
      await fetchExperiments();
    } catch (error) {
      console.error('Failed to delete experiment:', error);
      // If delete failed, refresh to restore correct state
      await fetchExperiments();
    }
  }, [fetchExperiments]);

  // Memoized stats calculations to avoid recalculating on every render
  const totalMoviesOnPage = useMemo(() => {
    return experiments.reduce((sum, exp) => sum + (exp.movieExperiments?.length || 0), 0);
  }, [experiments]);

  const getNextExperimentNumber = useMemo(() => {
    if (experiments.length === 0) return '001';
    const maxNumber = Math.max(...experiments.map(exp => parseInt(exp.experimentNumber) || 0));
    return String(maxNumber + 1).padStart(3, '0');
  }, [experiments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Experiments</h1>
          <p className="text-gray-400 mt-1">Manage movie viewing experiments and events</p>
        </div>
        <button
          onClick={() => navigate('/experiments/new')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>➕</span>
          Create Experiment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-dark-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">{pagination.total}</div>
          <div className="text-gray-400">Total Experiments</div>
        </div>
        <div className="bg-dark-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-white">{totalMoviesOnPage}</div>
          <div className="text-gray-400">Movies on Page</div>
        </div>
      </div>

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
      )}

      {/* Loading State */}
      {loading && !error && (
        <MovieGridSkeleton count={pagination.limit} />
      )}

      {/* Experiments Grid */}
      {!loading && !error && experiments.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {experiments.map(experiment => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onEdit={(experiment) => navigate(`/experiments/${experiment.id}/edit`)}
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

      {/* Empty State */}
      {!loading && !error && experiments.length === 0 && (
        <div className="bg-dark-800 p-8 rounded-lg text-center">
          <div className="text-gray-400 text-lg">
            {searchQuery ? 'No experiments found matching your search.' : 'No experiments created yet.'}
          </div>
          {!searchQuery && (
            <button
              onClick={() => navigate('/experiments/new')}
              className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create Your First Experiment
            </button>
          )}
        </div>
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
                value={formData.eventDate || ''}
                onChange={(e) => handleInputChange('eventDate', e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Time *
              </label>
              <input
                type="time"
                value={formData.eventTime || '22:00'}
                onChange={(e) => handleInputChange('eventTime', e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timezone *
              </label>
              <select
                value={formData.eventTimezone || 'America/New_York'}
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
