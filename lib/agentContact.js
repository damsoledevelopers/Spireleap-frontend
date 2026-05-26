/**
 * Open Gmail compose with prefilled to / subject / body (same pattern as Contact Messages reply).
 * @see components/CMS/ContactMessagesManagement.js openGmailReply
 */
export function openGmailCompose({ to, subject, bodyLines = [] }) {
  const email = String(to || '').trim()
  if (!email) {
    return { ok: false, error: 'Email address is not available' }
  }

  const subjectLine = String(subject || 'Property inquiry').trim()
  const body = bodyLines.filter((line) => line !== null && line !== undefined).join('\n')
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`

  window.open(url, '_blank', 'noopener,noreferrer')
  return { ok: true }
}

/** Opens the device phone dialer. */
export function openPhoneCall(phone) {
  const raw = String(phone || '').trim()
  if (!raw) {
    return { ok: false, error: 'Phone number is not available' }
  }
  const tel = raw.replace(/[^\d+]/g, '')
  if (!tel) {
    return { ok: false, error: 'Phone number is not available' }
  }
  window.location.href = `tel:${tel}`
  return { ok: true }
}

/** True on phones / small tablets — used to show Call vs Email choice. */
export function isMobileContactView() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(max-width: 767px)').matches ||
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  )
}

export function buildCustomerToAgentEmail({ agentName, propertyTitle, propertyLocation, customerName }) {
  const subject = propertyTitle ? `Inquiry: ${propertyTitle}` : 'Property inquiry follow-up'
  const bodyLines = [
    `Hi ${agentName || 'there'},`,
    '',
    'I submitted an inquiry through the website and would like to discuss this property.',
    '',
    propertyTitle ? `Property: ${propertyTitle}` : null,
    propertyLocation ? `Location: ${propertyLocation}` : null,
    '',
    'Thank you,',
    customerName || ''
  ].filter((line) => line !== null && line !== '')

  return { subject, bodyLines }
}

/** Agent shown to customers (assigned, or platform default from API). */
export function getDisplayAgent(inquiry) {
  return inquiry?.displayAgent || inquiry?.assignedAgent || null
}

export function getDisplayAgency(inquiry) {
  return inquiry?.displayAgency || inquiry?.agency || null
}

export function getAgentContactFromInquiry(inquiry, apiContact) {
  const agent = getDisplayAgent(inquiry)
  const name =
    apiContact?.name ||
    [agent?.firstName, agent?.lastName].filter(Boolean).join(' ').trim() ||
    ''
  return {
    name,
    email: apiContact?.email || agent?.email || null,
    phone: apiContact?.phone || agent?.phone || null
  }
}
