import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    // Remove duplicates and handle edge cases
    return Array.from(new Set(rangeWithDots.filter(page => 
      page === '...' || (typeof page === 'number' && page <= totalPages)
    )));
  };

  if (totalPages <= 1) return null;

  return (
    <div className="bg-dark-800 p-4 rounded-lg shadow-md">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        {/* Items per page selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-300">
            Show:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="bg-dark-700 border border-dark-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={12}>12 per page</option>
            <option value={24}>24 per page</option>
            <option value={48}>48 per page</option>
            <option value={96}>96 per page</option>
          </select>
        </div>

        {/* Page info */}
        <div className="text-sm text-gray-300">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> movies
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-2 text-sm bg-dark-700 border border-dark-600 rounded-l hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            Previous
          </button>

          {/* Page numbers */}
          <div className="flex">
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-3 py-2 text-sm bg-dark-700 border-t border-b border-dark-600 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    onClick={() => onPageChange(page as number)}
                    className={`px-3 py-2 text-sm border-t border-b border-dark-600 transition-colors ${
                      currentPage === page
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-dark-700 text-white hover:bg-dark-600'
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-2 text-sm bg-dark-700 border border-dark-600 rounded-r hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Quick jump to page (for large datasets) */}
      {totalPages > 10 && (
        <div className="mt-4 pt-4 border-t border-dark-600 flex items-center justify-center gap-2">
          <label htmlFor="jumpToPage" className="text-sm text-gray-300">
            Jump to page:
          </label>
          <input
            id="jumpToPage"
            type="number"
            min={1}
            max={totalPages}
            placeholder={currentPage.toString()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const page = parseInt((e.target as HTMLInputElement).value);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
            className="w-16 bg-dark-700 border border-dark-600 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-400">of {totalPages}</span>
        </div>
      )}
    </div>
  );
};
