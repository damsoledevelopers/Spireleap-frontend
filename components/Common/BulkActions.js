'use client'

import { useState } from 'react'
import { CheckSquare, Square, Trash2, Edit, Download, MoreVertical } from 'lucide-react'

export default function BulkActions({ 
  items = [], 
  selectedItems = [], 
  onSelectAll, 
  onSelectItem,
  onBulkDelete,
  onBulkUpdate,
  onBulkExport,
  actions = []
}) {
  const [showActions, setShowActions] = useState(false)
  const allSelected = selectedItems.length === items.length && items.length > 0
  const someSelected = selectedItems.length > 0 && selectedItems.length < items.length

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectAll([])
    } else {
      onSelectAll(items.map(item => item._id || item.id))
    }
  }

  if (items.length === 0) return null

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={handleSelectAll}
          className="p-1 hover:bg-gray-100 rounded"
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          {allSelected ? (
            <CheckSquare className="h-5 w-5 text-primary-600" />
          ) : (
            <Square className="h-5 w-5 text-gray-400" />
          )}
        </button>
        <span className="text-sm text-gray-700">
          {selectedItems.length > 0 
            ? `${selectedItems.length} of ${items.length} selected`
            : `${items.length} items`}
        </span>
      </div>

      {selectedItems.length > 0 && (
        <div className="flex items-center gap-2">
          {onBulkExport && (
            <button
              onClick={() => onBulkExport(selectedItems)}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
          {onBulkUpdate && (
            <button
              onClick={() => onBulkUpdate(selectedItems)}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Update
            </button>
          )}
          {onBulkDelete && (
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
                  onBulkDelete(selectedItems)
                }
              }}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => action.onClick(selectedItems)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 ${action.className || 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

