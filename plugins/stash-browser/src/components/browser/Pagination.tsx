/**
 * Pagination Component
 */

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Calculate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5;
    const halfShow = Math.floor(showPages / 2);

    let start = Math.max(0, currentPage - halfShow);
    let end = Math.min(totalPages - 1, currentPage + halfShow);

    // Adjust if at edges
    if (currentPage < halfShow) {
      end = Math.min(totalPages - 1, showPages - 1);
    }
    if (currentPage > totalPages - halfShow - 1) {
      start = Math.max(0, totalPages - showPages);
    }

    // Add first page and ellipsis if needed
    if (start > 0) {
      pages.push(0);
      if (start > 1) {
        pages.push('ellipsis');
      }
    }

    // Add visible pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add last page and ellipsis if needed
    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages - 1);
    }

    return pages;
  };

  return (
    <nav className="d-flex justify-content-center mt-4">
      <ul className="pagination mb-0">
        {/* Previous */}
        <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
          <button
            className="page-link bg-dark text-light border-secondary"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            &laquo;
          </button>
        </li>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => (
          page === 'ellipsis' ? (
            <li key={`ellipsis-${index}`} className="page-item disabled">
              <span className="page-link bg-dark text-muted border-secondary">...</span>
            </li>
          ) : (
            <li
              key={page}
              className={`page-item ${page === currentPage ? 'active' : ''}`}
            >
              <button
                className={`page-link border-secondary ${
                  page === currentPage
                    ? 'bg-primary text-light'
                    : 'bg-dark text-light'
                }`}
                onClick={() => onPageChange(page)}
              >
                {page + 1}
              </button>
            </li>
          )
        ))}

        {/* Next */}
        <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
          <button
            className="page-link bg-dark text-light border-secondary"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
          >
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
};
