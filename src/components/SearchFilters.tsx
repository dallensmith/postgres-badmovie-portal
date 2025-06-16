import React from 'react';

export interface SearchFiltersProps {
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

export const SearchFilters: React.FC<SearchFiltersProps> = ({
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
    { value: 'createdAt', label: 'Date Added' },
    { value: 'movieTitle', label: 'Title' },
    { value: 'movieYear', label: 'Year' },
    { value: 'movieTmdbRating', label: 'Rating' }
  ];

  const hasFilters = searchQuery || selectedYear || sortBy !== 'createdAt' || sortOrder !== 'desc';

  return (
    <div className="bg-dark-800 p-6 rounded-lg shadow-md mb-6">
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
            Search Movies
          </label>
          <div className="relative">
            <input
              id="search"
              type="text"
              placeholder="Search by title, original title, or overview..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
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
                  {option.label} (Newest/Highest First)
                </option>
                <option value={`${option.value}-asc`}>
                  {option.label} (Oldest/Lowest First)
                </option>
              </React.Fragment>
            ))}
          </select>
        </div>
      </div>

      {/* Results Summary and Clear Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-gray-300">
          <span className="font-medium">{totalResults.toLocaleString()}</span> movies found
          {hasFilters && (
            <span className="text-gray-400 ml-2">
              (filtered results)
            </span>
          )}
        </div>

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasFilters && (
        <div className="mt-4 pt-4 border-t border-dark-600">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-400">Active filters:</span>
            {searchQuery && (
              <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm">
                Search: "{searchQuery}"
              </span>
            )}
            {selectedYear && (
              <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm">
                Year: {selectedYear}
              </span>
            )}
            {(sortBy !== 'createdAt' || sortOrder !== 'desc') && (
              <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm">
                Sort: {sortOptions.find(opt => opt.value === sortBy)?.label} ({sortOrder === 'desc' ? 'Desc' : 'Asc'})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
