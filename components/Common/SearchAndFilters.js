'use client'

import { Search } from 'lucide-react'

export default function SearchAndFilters({ 
  onSearch, 
  filters = [], 
  onFilterChange,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange
}) {
  const handleSearch = (e) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchValue)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <form onSubmit={handleSearch} className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => {
              if (onSearchChange) {
                onSearchChange(e.target.value)
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Search
        </button>
      </form>

      {filters.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {filters.map((filter, index) => (
            <div key={index}>
              {filter.type === 'select' ? (
                <select
                  value={filter.value}
                  onChange={(e) => onFilterChange(filter.key, e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : filter.type === 'date' ? (
                <input
                  type="date"
                  value={filter.value}
                  onChange={(e) => onFilterChange(filter.key, e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

