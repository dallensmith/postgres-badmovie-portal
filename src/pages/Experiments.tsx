import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

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

export default function Experiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'number'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExperiments, setTotalExperiments] = useState(0);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search/sort changes
    loadExperiments();
  }, [debouncedSearchTerm, sortBy, sortOrder]);

  useEffect(() => {
    loadExperiments();
  }, [currentPage]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getExperimentsWithMovies(
        currentPage, 
        50, // Load 50 per page
        debouncedSearchTerm,
        sortBy,
        sortOrder
      );
      setExperiments(data.experiments || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalExperiments(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load experiments:', error);
    } finally {
      setLoading(false);
    }
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
      await loadExperiments();
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
      await loadExperiments();
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
      await loadExperiments();
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
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <span className="ml-3 text-gray-400">Loading experiments...</span>
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
          <div className="text-2xl font-bold text-white">{totalExperiments}</div>
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

      {/* Filters */}
      <div className="bg-dark-800 p-4 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search experiments by number, host, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'number')}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="date">Sort by Date</option>
              <option value="number">Sort by Number</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white hover:bg-dark-600 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Experiments Grid */}
      {experiments.length === 0 ? (
        <div className="bg-dark-800 p-8 rounded-lg text-center">
          <div className="text-gray-400 text-lg">
            {debouncedSearchTerm ? 'No experiments found matching your search.' : 'No experiments created yet.'}
          </div>
          {!debouncedSearchTerm && (
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-dark-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600"
              >
                Previous
              </button>
              
              <span className="text-white">
                Page {currentPage} of {totalPages} ({totalExperiments} total experiments)
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-dark-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600"
              >
                Next
              </button>
            </div>
          )}
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
