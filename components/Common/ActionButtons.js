'use client'

import Link from 'next/link'
import { Eye, Edit, Trash2, CheckCircle, XCircle, MoreVertical } from 'lucide-react'

export default function ActionButtons({
  viewUrl,
  editUrl,
  onDelete,
  onApprove,
  onReject,
  customActions = [],
  showView = true,
  showEdit = true,
  showDelete = true
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      {showView && viewUrl && (
        <Link
          href={viewUrl}
          className="text-blue-600 hover:text-blue-900 transition-colors"
          title="View"
        >
          <Eye className="h-5 w-5" />
        </Link>
      )}
      {showEdit && editUrl && (
        <Link
          href={editUrl}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title="Edit"
        >
          <Edit className="h-5 w-5" />
        </Link>
      )}
      {onApprove && (
        <button
          onClick={onApprove}
          className="text-green-600 hover:text-green-900 transition-colors"
          title="Approve"
        >
          <CheckCircle className="h-5 w-5" />
        </button>
      )}
      {onReject && (
        <button
          onClick={onReject}
          className="text-red-600 hover:text-red-900 transition-colors"
          title="Reject"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-900 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
      {customActions.map((action, index) => (
        <div key={index}>{action}</div>
      ))}
    </div>
  )
}

