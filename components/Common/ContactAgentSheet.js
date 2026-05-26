'use client'

import { Mail, Phone, X } from 'lucide-react'
import { openGmailCompose, openPhoneCall, buildCustomerToAgentEmail } from '../../lib/agentContact'

/** Mobile only: choose Email (Gmail compose) or Call. Call is hidden on laptop/desktop. */
export default function ContactAgentSheet({
  open,
  onClose,
  agentContact,
  propertyTitle,
  propertyLocation,
  customerName,
  statusMessage
}) {
  if (!open || !agentContact) return null

  const hasEmail = Boolean(agentContact.email?.trim())
  const hasPhone = Boolean(agentContact.phone?.trim())

  const handleEmail = () => {
    const { subject, bodyLines } = buildCustomerToAgentEmail({
      agentName: agentContact.name,
      propertyTitle,
      propertyLocation,
      customerName
    })
    const result = openGmailCompose({
      to: agentContact.email,
      subject,
      bodyLines
    })
    if (!result.ok) {
      return result
    }
    onClose()
    return result
  }

  const handleCall = () => {
    const result = openPhoneCall(agentContact.phone)
    if (result.ok) onClose()
    return result
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-agent-sheet-title"
        className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="contact-agent-sheet-title" className="text-lg font-bold text-gray-900">
              Contact {agentContact.name || 'your agent'}
            </h2>
            {statusMessage && <p className="text-sm text-gray-500 mt-1">{statusMessage}</p>}
            <p className="text-xs text-gray-400 mt-2">Choose how you would like to reach out</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {hasEmail && (
            <button
              type="button"
              onClick={handleEmail}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-bold text-sm"
            >
              <Mail className="h-5 w-5 shrink-0" />
              Via Email
            </button>
          )}
          {hasPhone && (
            <button
              type="button"
              onClick={handleCall}
              className="md:hidden w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-bold text-sm"
            >
              <Phone className="h-5 w-5 shrink-0" />
              Call {agentContact.phone}
            </button>
          )}
          {!hasEmail && !hasPhone && (
            <p className="text-sm text-gray-500 text-center py-4">No contact details available for this agent.</p>
          )}
        </div>

        <div className="px-5 pb-5 sm:pb-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
