import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

interface Movie {
  id: number;
  movieTitle: string;
  moviePoster: string | null;
  movieYear: string | null;
  movieOverview: string | null;
  movieRuntime: number | null;
  movieGenres: string[] | null;
}

interface ExperimentDetail {
  id: number;
  experimentNumber: string;
  eventDate: string;
  eventHost: string;
  eventLocation: string;
  eventNotes: string | null;
  eventAttendees: string | null;
  eventImage: string | null;
  postUrl: string | null;
  movieExperiments?: Array<{
    isEncore?: boolean;
    movie: Movie;
  }>;
}

export default function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadExperiment(parseInt(id));
    }
  }, [id]);

  const loadExperiment = async (experimentId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getExperiment(experimentId);
      setExperiment(data);
    } catch (error) {
      console.error('Failed to load experiment:', error);
      setError('Failed to load experiment details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-lg">Loading experiment details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="min-h-screen bg-dark-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-red-400 text-lg mb-4">{error || 'Experiment not found'}</div>
            <button
              onClick={() => navigate('/experiments')}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded"
            >
              Back to Experiments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/experiments')}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ←
            </button>
            <h1 className="text-3xl font-bold">Experiment #{experiment.experimentNumber}</h1>
          </div>
          <div className="flex gap-3">
            {experiment.postUrl && (
              <a
                href={experiment.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                View Post
              </a>
            )}
            <button
              onClick={() => navigate(`/experiments/${experiment.id}/edit`)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
            >
              Edit Experiment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-1">
            {experiment.eventImage && (
              <div className="mb-6">
                <img
                  src={experiment.eventImage}
                  alt={`Experiment ${experiment.experimentNumber}`}
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            )}

            <div className="bg-dark-800 p-6 rounded-lg space-y-4">
              <h2 className="text-xl font-bold mb-4">Event Details</h2>
              
              <div>
                <div className="text-gray-400 text-sm">Date</div>
                <div className="text-white">
                  {(() => {
                    const dateStr = typeof experiment.eventDate === 'string' 
                      ? experiment.eventDate.split('T')[0] 
                      : new Date(experiment.eventDate).toISOString().split('T')[0];
                    const [year, month, day] = dateStr.split('-');
                    return `${month}/${day}/${year}`;
                  })()}
                </div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Host</div>
                <div className="text-white">{experiment.eventHost}</div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Location</div>
                <div className="text-white">{experiment.eventLocation}</div>
              </div>

              {experiment.eventAttendees && (
                <div>
                  <div className="text-gray-400 text-sm">Attendees</div>
                  <div className="text-white">{experiment.eventAttendees}</div>
                </div>
              )}

              {experiment.eventNotes && (
                <div>
                  <div className="text-gray-400 text-sm">Notes</div>
                  <div className="text-gray-300 bg-dark-700 p-3 rounded text-sm">
                    {experiment.eventNotes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Movies */}
          <div className="lg:col-span-2">
            <div className="bg-dark-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  Movies ({experiment.movieExperiments?.length || 0})
                </h2>
                <div className="text-sm text-gray-400">
                  {experiment.movieExperiments?.filter(me => me.isEncore).length || 0} encores
                </div>
              </div>

              {experiment.movieExperiments && experiment.movieExperiments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {experiment.movieExperiments.map((movieExp, index) => (
                    <MovieCard key={index} movieExp={movieExp} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No movies linked to this experiment yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Movie Card Component for the detail page
function MovieCard({ movieExp }: { movieExp: { isEncore?: boolean; movie: Movie } }) {
  return (
    <div className="bg-dark-700 rounded-lg overflow-hidden hover:bg-dark-600 transition-colors">
      <div className="flex">
        {movieExp.movie.moviePoster && (
          <img
            src={movieExp.movie.moviePoster}
            alt={movieExp.movie.movieTitle}
            className="w-20 h-28 object-cover"
          />
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-white text-sm leading-tight">
              {movieExp.movie.movieTitle}
            </h3>
            {movieExp.isEncore && (
              <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold ml-2 flex-shrink-0">
                ENCORE
              </span>
            )}
          </div>
          
          <div className="text-gray-400 text-xs mb-2">
            {movieExp.movie.movieYear}
            {movieExp.movie.movieRuntime && ` • ${movieExp.movie.movieRuntime} min`}
          </div>

          {movieExp.movie.movieGenres && movieExp.movie.movieGenres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {movieExp.movie.movieGenres.slice(0, 3).map((genre, index) => (
                <span key={index} className="bg-dark-800 text-xs px-2 py-0.5 rounded text-gray-300">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {movieExp.movie.movieOverview && (
            <p className="text-gray-400 text-xs line-clamp-2">
              {movieExp.movie.movieOverview.substring(0, 100)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
