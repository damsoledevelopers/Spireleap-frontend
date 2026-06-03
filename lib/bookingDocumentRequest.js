/** Whether admin is waiting for the customer to upload more booking documents */
export function hasActiveDocumentRequest(transaction) {
  const approval = transaction?.approval
  return Boolean(
    approval?.awaitingAdditionalDocuments &&
    (approval?.documentRequestMessage?.trim() || (approval?.requiredDocuments || []).length > 0)
  )
}

export function getRequiredDocumentsList(transaction) {
  const list = transaction?.approval?.requiredDocuments || []
  return list.map((s) => String(s).trim()).filter(Boolean)
}

export function getDocumentRequestMessage(transaction) {
  return transaction?.approval?.documentRequestMessage?.trim() || ''
}
