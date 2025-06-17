import React from 'react';

export interface ExperimentFiltersProps {
  searchQuery: string;
  selectedYear: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  availableYears: string[];
  onSearchChange: (query: string) => void;
  onYearChange: (year: string) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  totalResults: number;
}

export const ExperimentFilters: React.FC<ExperimentFiltersProps> = ({
  searchQuery,
  selectedYear,
  sortBy,
  sortOrder,
  availableYears,
  onSearchChange,
  onYearChange,
  onSortChange,
  onClearFilters,
  totalResults
}) => {
  const sortOptions = [
    { value: 'date', label: 'Event Date' },
    { value: 'number', label: 'Experiment Number' },
    { value: 'createdAt', label: 'Date Added' }
  ];

  const hasFilters = searchQuery || selectedYear || sortBy !== 'date' || sortOrder !== 'desc';

  return (
    <div className="bg-dark-800 p-6 rounded-lg shadow-md mb-6">
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
            Search Experiments
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="Search by number, host, location, notes, or attendees..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoComplete="off"
              spellCheck="false"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Year Filter */}
        <div className="lg:w-48">
          <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-2">
            Year
          </label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <div className="lg:w-48">
          <label htmlFor="sort" className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            id="sort"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [string, 'asc' | 'desc'];
              onSortChange(field, order);
            }}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <React.Fragment key={option.value}>
                <option value={`${option.value}-desc`}>
                  {option.label} (Newest First)
                </option>
                <option value={`${option.value}-asc`}>
                  {option.label} (Oldest First)
                </option>
              </React.Fragment>
            ))}
          </select>
        </div>
      </div>

      {/* Filter summary and clear button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {totalResults > 0 && (
            <span>
              {totalResults === 1 
                ? '1 experiment found' 
                : `${totalResults.toLocaleString()} experiments found`}
            </span>
          )}
        </div>
        
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};
