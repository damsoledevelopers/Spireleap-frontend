// Centralized dropdown option sets (single source of truth)

export const PAGINATION_LIMITS = [10, 20, 50, 100]

export const CURRENCIES = ['AED', 'USD', 'INR']
export const TIMEZONES = ['UTC', 'EST', 'PST', 'GMT']
export const LANGUAGES = ['en', 'es', 'fr', 'de']
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error']
export const BACKUP_FREQUENCIES = ['hourly', 'daily', 'weekly', 'monthly']

export const BUDGET_CURRENCIES = ['USD', 'EUR', 'GBP']

export const INQUIRY_TIMELINES = [
  { value: 'immediate', label: 'Immediate' },
  { value: '1_month', label: '1 Month' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'flexible', label: 'Flexible' }
]

// Leads
export const LEAD_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk In' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' }
]

export const LEAD_PRIORITIES = [
  { value: 'Hot', label: 'Hot' },
  { value: 'Warm', label: 'Warm' },
  { value: 'Cold', label: 'Cold' },
  { value: 'Not_interested', label: 'Not Interested' }
]

export const LEAD_STATUSES = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { value: 'site_visit_completed', label: 'Site Visit Completed' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
  { value: 'closed', label: 'Closed' },
  { value: 'junk', label: 'Junk / Invalid' }
]

export const AUTO_ASSIGN_METHODS = [
  { value: 'round_robin', label: 'Round-Robin' },
  { value: 'workload', label: 'Workload-Based (Least Leads)' },
  { value: 'location', label: 'Location-Based' },
  { value: 'project', label: 'Project-Based' },
  { value: 'source', label: 'Source-Based' },
  { value: 'smart', label: 'Smart Assignment' }
]

