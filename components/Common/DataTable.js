'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Package } from 'lucide-react'

export default function DataTable({ 
  columns = [], 
  data = [], 
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon: EmptyIcon = Package,
  onRowClick,
  actions = null
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0

    const aValue = getNestedValue(a, sortConfig.key)
    const bValue = getNestedValue(b, sortConfig.key)

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    return sortConfig.direction === 'asc'
      ? aValue - bValue
      : bValue - aValue
  })

  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj)
  }

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-primary-600" />
      : <ChevronDown className="h-4 w-4 text-primary-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (sortedData.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <EmptyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2 group">
                    <span>{column.label}</span>
                    {column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, rowIndex) => (
              <tr
                key={row.id || row._id || rowIndex}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 ${
                      column.className || ''
                    } ${column.nowrap ? 'whitespace-nowrap' : ''}`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : column.format
                      ? column.format(getNestedValue(row, column.key), row)
                      : getNestedValue(row, column.key) || 'N/A'}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

