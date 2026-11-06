import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import '../styles/pagination.css'

/**
 * Reusable Pagination component styled for dark slate theme (#0f172a / #1e293b)
 * with orange (#f97316) active accents.
 *
 * @param {number} currentPage - Currently active page (1-based index)
 * @param {number} totalItems - Total count of matching items across entire collection
 * @param {number} rowsPerPage - Number of items displayed per page (defaults to 10)
 * @param {function} onPageChange - Callback when a new page is clicked: (newPage: number) => void
 * @param {function} onPageSizeChange - Callback when rows per page changes: (newSize: number) => void
 * @param {number[]} pageSizeOptions - Dropdown options for rows per page (default [10, 25, 50, 100])
 * @param {string} itemName - Noun for the item count display (default "items")
 * @param {string} className - Optional container CSS class name
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  rowsPerPage = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = 'items',
  className = '',
}) {
  const safePageSize = Number(rowsPerPage) > 0 ? Number(rowsPerPage) : 10
  const safeTotalItems = Math.max(0, Number(totalItems) || 0)
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize))
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages)

  const startItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1
  const endItem = Math.min(safeTotalItems, safeCurrentPage * safePageSize)

  // Smart page number algorithm with ellipsis (...)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages]
  }, [safeCurrentPage, totalPages])

  const handlePrev = () => {
    if (safeCurrentPage > 1 && onPageChange) {
      onPageChange(safeCurrentPage - 1)
    }
  }

  const handleNext = () => {
    if (safeCurrentPage < totalPages && onPageChange) {
      onPageChange(safeCurrentPage + 1)
    }
  }

  const handlePageClick = (page) => {
    if (page !== '...' && page !== safeCurrentPage && onPageChange) {
      onPageChange(page)
    }
  }

  const handleSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10)
    if (onPageSizeChange) {
      onPageSizeChange(newSize)
    }
  }

  return (
    <div className={`jem-pagination ${className}`.trim()} aria-label="Table pagination navigation">
      {/* Left side: Entry counter & Rows per page selector */}
      <div className="jem-pagination-left">
        <div className="jem-pagination-info">
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
          <strong>{safeTotalItems.toLocaleString()}</strong> {itemName}
        </div>

        {onPageSizeChange && (
          <div className="jem-pagination-size">
            <span>Rows per page:</span>
            <div className="jem-pagination-select-wrapper">
              <select
                className="jem-pagination-select"
                value={safePageSize}
                onChange={handleSizeChange}
                aria-label="Select rows per page"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="jem-pagination-select-chevron" />
            </div>
          </div>
        )}
      </div>

      {/* Right side: Previous, Page numbers, Next */}
      <div className="jem-pagination-right">
        {/* Previous Button */}
        <button
          type="button"
          className="jem-pagination-btn jem-pagination-nav"
          onClick={handlePrev}
          disabled={safeCurrentPage <= 1 || safeTotalItems === 0}
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        {/* Page numbers with smart ellipsis */}
        {pageNumbers.map((num, idx) => {
          if (num === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="jem-pagination-ellipsis" aria-hidden="true">
                ...
              </span>
            )
          }

          const isActive = num === safeCurrentPage
          return (
            <button
              key={`page-${num}`}
              type="button"
              className={`jem-pagination-btn ${isActive ? 'active' : ''}`.trim()}
              onClick={() => handlePageClick(num)}
              aria-label={`Page ${num}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {num}
            </button>
          )
        })}

        {/* Next Button */}
        <button
          type="button"
          className="jem-pagination-btn jem-pagination-nav"
          onClick={handleNext}
          disabled={safeCurrentPage >= totalPages || safeTotalItems === 0}
          title="Next page"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
