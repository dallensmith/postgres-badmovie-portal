import React, { useMemo } from 'react';

export interface Experiment {
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

export interface ExperimentCardProps {
  experiment: Experiment;
  onEdit?: (experiment: Experiment) => void;
  onDelete?: (experimentId: number) => void;
  onView?: (experiment: Experiment) => void;
}

export const ExperimentCard: React.FC<ExperimentCardProps> = React.memo(({ 
  experiment, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  // Memoize expensive calculations
  const imageUrl = useMemo(() => 
    experiment.eventImage || '/placeholder-experiment.svg', 
    [experiment.eventImage]
  );
  
  const formattedDate = useMemo(() => {
    // Handle the date properly for EST timezone to avoid off-by-one errors
    const date = new Date(experiment.eventDate);
    // Extract just the date components to avoid timezone shifting issues
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    return `${month}/${day}/${year}`;
  }, [experiment.eventDate]);
  
  const movieCount = useMemo(() => 
    experiment.movieExperiments?.length || 0, 
    [experiment.movieExperiments]
  );
  
  const encoreCount = useMemo(() => 
    experiment.movieExperiments?.filter(me => me.isEncore).length || 0, 
    [experiment.movieExperiments]
  );

  return (
    <div className="bg-dark-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      {/* Experiment Image */}
      <div className="relative aspect-[4/3] bg-dark-700">
        <img
          src={imageUrl}
          alt={`Experiment ${experiment.experimentNumber}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-experiment.svg';
          }}
        />
        <div className="absolute top-2 right-2">
          <span className="bg-primary-500 text-white px-2 py-1 rounded text-sm font-semibold">
            #{experiment.experimentNumber}
          </span>
        </div>
        {experiment.eventEncore && (
          <div className="absolute top-2 left-2">
            <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">
              ENCORE
            </span>
          </div>
        )}
      </div>

      {/* Experiment Info - Flex grow to push buttons to bottom */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          {/* Title and Date */}
          <div className="mb-3">
            <h3 className="text-lg font-bold text-white truncate">
              Experiment #{experiment.experimentNumber}
            </h3>
            <p className="text-gray-400 text-sm">{formattedDate}</p>
          </div>

          {/* Host and Location */}
          <div className="mb-3 space-y-1">
            <p className="text-gray-300 text-sm">
              <span className="font-medium">Host:</span> {experiment.eventHost}
            </p>
            <p className="text-gray-300 text-sm">
              <span className="font-medium">Location:</span> {experiment.eventLocation}
            </p>
          </div>

          {/* Movie Count and Encores */}
          <div className="mb-3 flex gap-2">
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
              {movieCount} {movieCount === 1 ? 'Movie' : 'Movies'}
            </span>
            {encoreCount > 0 && (
              <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                {encoreCount} {encoreCount === 1 ? 'Encore' : 'Encores'}
              </span>
            )}
          </div>

          {/* Movies List Preview */}
          {experiment.movieExperiments && experiment.movieExperiments.length > 0 && (
            <div className="mb-3">
              <p className="text-gray-400 text-xs mb-1">Movies:</p>
              <div className="space-y-1">
                {experiment.movieExperiments.slice(0, 2).map((movieExp, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-gray-300 text-xs truncate">
                      {movieExp.movie.movieTitle}
                    </span>
                    {movieExp.isEncore && (
                      <span className="bg-yellow-500 text-black px-1 py-0.5 rounded text-xs font-semibold">
                        E
                      </span>
                    )}
                  </div>
                ))}
                {experiment.movieExperiments.length > 2 && (
                  <span className="text-gray-400 text-xs">
                    +{experiment.movieExperiments.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notes Preview */}
          {experiment.eventNotes && (
            <div className="mb-3">
              <p className="text-gray-300 text-xs line-clamp-2">
                {experiment.eventNotes.length > 100 
                  ? `${experiment.eventNotes.substring(0, 100)}...`
                  : experiment.eventNotes
                }
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto">
          {onView && (
            <button
              onClick={() => onView(experiment)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors text-sm"
            >
              View
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(experiment)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors text-sm"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(experiment.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition-colors text-sm"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
