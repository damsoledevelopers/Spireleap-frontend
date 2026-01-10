// CSV Export Utility
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle nested objects and arrays
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') {
          if (Array.isArray(value)) return `"${value.join('; ')}"`
          return `"${JSON.stringify(value)}"`
        }
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value).replace(/"/g, '""')
        return stringValue.includes(',') || stringValue.includes('\n') 
          ? `"${stringValue}"` 
          : stringValue
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Excel Export using CSV format (for simple Excel compatibility)
export const exportToExcel = (data, filename = 'export.xlsx') => {
  // For now, export as CSV with .xlsx extension
  // In production, you'd use a library like xlsx or exceljs
  exportToCSV(data, filename.replace('.xlsx', '.csv'))
}

// Format data for export
export const formatLeadsForExport = (leads) => {
  return leads.map(lead => ({
    'Lead ID': lead._id,
    'First Name': lead.contact?.firstName || '',
    'Last Name': lead.contact?.lastName || '',
    'Email': lead.contact?.email || '',
    'Phone': lead.contact?.phone || '',
    'Status': lead.status || '',
    'Priority': lead.priority || '',
    'Source': lead.source || '',
    'Property': lead.property?.title || 'N/A',
    'Assigned Agent': lead.assignedAgent ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}` : 'Unassigned',
    'Created Date': new Date(lead.createdAt).toLocaleDateString(),
    'Last Updated': new Date(lead.updatedAt).toLocaleDateString()
  }))
}

export const formatPropertiesForExport = (properties) => {
  return properties.map(property => ({
    'Property ID': property._id,
    'Title': property.title || '',
    'Type': property.propertyType || '',
    'Listing Type': property.listingType || '',
    'Status': property.status || '',
    'Sale Price': property.price?.sale || '',
    'Rent Amount': property.price?.rent?.amount || '',
    'Rent Period': property.price?.rent?.period || '',
    'City': property.location?.city || '',
    'State': property.location?.state || '',
    'Address': property.location?.address || '',
    'Bedrooms': property.specifications?.bedrooms || '',
    'Bathrooms': property.specifications?.bathrooms || '',
    'Area': `${property.specifications?.area?.value || ''} ${property.specifications?.area?.unit || ''}`,
    'Agent': property.agent ? `${property.agent.firstName} ${property.agent.lastName}` : '',
    'Created Date': new Date(property.createdAt).toLocaleDateString()
  }))
}

export const formatAgentsForExport = (agents) => {
  return agents.map(agent => ({
    'Agent ID': agent._id,
    'First Name': agent.firstName || '',
    'Last Name': agent.lastName || '',
    'Email': agent.email || '',
    'Phone': agent.phone || '',
    'License Number': agent.agentInfo?.licenseNumber || '',
    'Years of Experience': agent.agentInfo?.yearsOfExperience || '',
    'Total Sales': agent.agentInfo?.totalSales || 0,
    'Total Leads': agent.agentInfo?.totalLeads || 0,
    'Rating': agent.agentInfo?.rating || 0,
    'Status': agent.isActive ? 'Active' : 'Inactive',
    'Created Date': new Date(agent.createdAt).toLocaleDateString()
  }))
}

