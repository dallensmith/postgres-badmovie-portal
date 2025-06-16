import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-gray-300 text-lg">{message}</p>
    </div>
  );
};

export interface MovieGridSkeletonProps {
  count?: number;
}

export const MovieGridSkeleton: React.FC<MovieGridSkeletonProps> = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-dark-800 rounded-lg shadow-md overflow-hidden animate-pulse">
          {/* Poster skeleton */}
          <div className="aspect-[2/3] bg-dark-700"></div>
          
          {/* Content skeleton */}
          <div className="p-4">
            {/* Title */}
            <div className="h-5 bg-dark-700 rounded mb-2"></div>
            <div className="h-4 bg-dark-700 rounded w-3/4 mb-3"></div>
            
            {/* Meta info */}
            <div className="flex justify-between mb-2">
              <div className="h-3 bg-dark-700 rounded w-16"></div>
              <div className="h-3 bg-dark-700 rounded w-16"></div>
            </div>
            
            {/* Description */}
            <div className="space-y-2 mb-3">
              <div className="h-3 bg-dark-700 rounded"></div>
              <div className="h-3 bg-dark-700 rounded"></div>
              <div className="h-3 bg-dark-700 rounded w-2/3"></div>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-dark-700 rounded"></div>
              <div className="h-8 w-16 bg-dark-700 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
