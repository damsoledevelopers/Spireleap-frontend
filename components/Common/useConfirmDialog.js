'use client'

import { useCallback, useState } from 'react'

export function useConfirmDialog() {
  const [dialog, setDialog] = useState(null)

  const closeDialog = useCallback((result) => {
    setDialog((prev) => {
      if (prev?.resolve) prev.resolve(result)
      return null
    })
  }, [])

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        title: options?.title || 'Please Confirm',
        message: options?.message || 'Are you sure?',
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        tone: options?.tone || 'danger',
        resolve
      })
    })
  }, [])

  const ConfirmDialog = useCallback(() => {
    if (!dialog) return null

    const confirmButtonClass =
      dialog.tone === 'danger'
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-primary-600 hover:bg-primary-700'

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/50"
          aria-hidden="true"
          onClick={() => closeDialog(false)}
        />
        <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900">{dialog.title}</h3>
          <p className="mt-2 text-sm text-gray-600">{dialog.message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => closeDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {dialog.cancelText}
            </button>
            <button
              type="button"
              onClick={() => closeDialog(true)}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${confirmButtonClass}`}
            >
              {dialog.confirmText}
            </button>
          </div>
        </div>
      </div>
    )
  }, [closeDialog, dialog])

  return { confirm, ConfirmDialog }
}

