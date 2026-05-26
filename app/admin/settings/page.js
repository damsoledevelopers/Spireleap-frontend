'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Save,
  RefreshCw,
  Database,
  Shield,
  Bell,
  Globe,
  User,
  Server,
  Eye,
  EyeOff,
  Mail
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import CategoryManagement from '../../../components/CMS/CategoryManagement'
import AmenityManagement from '../../../components/CMS/AmenityManagement'
import PropertyTypeManagement from '../../../components/CMS/PropertyTypeManagement'
import CurrencyManagement from '../../../components/CMS/CurrencyManagement'
import LocationManagement from '../../../components/CMS/LocationManagement'
import SearchableSelect from '../../../components/Common/SearchableSelect'
import { getDropdownOptions, clearDropdownOptionsCache } from '../../../lib/dropdownsApi'
import { buildCurrencySelectOptions, ensureCurrencyInOptions } from '../../../lib/currencySelectOptions'

export default function AdminSettings() {
  return <SettingsPageContent />
}

export function SettingsPageContent() {
  const { user, checkPermission } = useAuth()
  const router = useRouter()

  // Dynamic Permission Flags
  const canViewSettings = checkPermission('settings', 'view')
  const canEditSettings = checkPermission('settings', 'edit')

  // Page access check
  useEffect(() => {
    if (user && !canViewSettings) {
      toast.error('You do not have permission to view settings')
      router.push('/admin/dashboard')
    }
  }, [user, canViewSettings, router])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [dropdowns, setDropdowns] = useState({
    currencies: [],
    currencyOptions: [],
    timezones: [],
    languages: [],
    logLevels: [],
    backupFrequencies: []
  })
  const [defaultAgencyAgentOptions, setDefaultAgencyAgentOptions] = useState({
    agencies: [],
    agents: []
  })

  const togglePasswordVisibility = (fieldName) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }
  const [settings, setSettings] = useState({
    general: {
      siteName: 'SPIRELEAP Real Estate',
      siteDescription: 'Real Estate CRM & CMS System',
      defaultCurrency: 'AED',
      timezone: 'UTC',
      language: 'en',
      spokenLanguageList: 'English, Arabic, Hindi, Urdu, French, Spanish, German',
      defaultAgencyId: '',
      defaultAgentId: ''
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireTwoFactor: false,
      allowRegistration: true
    },
    notifications: {
      emailNotifications: true,
      proposalNotifications: true,
      userNotifications: true,
      systemNotifications: true,
      loginAlerts: true
    },
    system: {
      maintenanceMode: false,
      debugMode: false,
      logLevel: 'info',
      backupFrequency: 'daily'
    },
    email: {
      smtpHost: '',
      smtpPort: 465,
      smtpUser: '',
      smtpPass: '',
      fromEmail: '',
      fromName: ''
    }
  })

  const loadDefaultAgencyAgentOptions = async (agencyId) => {
    try {
      const q = agencyId ? `?agency=${encodeURIComponent(agencyId)}` : ''
      const res = await api.get(`/settings/default-agency-agent/options${q}`)
      const data = res.data || {}
      setDefaultAgencyAgentOptions({
        agencies: data.agencies || [],
        agents: data.agents || []
      })
      return data
    } catch (e) {
      console.error('Error loading default agency/agent options:', e)
      return null
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (!canViewSettings) return
    loadDefaultAgencyAgentOptions(settings.general.defaultAgencyId || undefined)
  }, [canViewSettings, settings.general.defaultAgencyId])

  const loadCurrencyOptions = async () => {
    clearDropdownOptionsCache()
    const [dropdownsRes, currencyRes] = await Promise.all([
      getDropdownOptions(),
      api.get('/currency').catch(() => ({ data: { currencies: [] } }))
    ])
    const currencyList = currencyRes.data?.currencies || []
    const codesFromDb = currencyList
      .map((c) => String(c.currencyCode || '').trim().toUpperCase())
      .filter(Boolean)
    const codesFromDropdown = dropdownsRes.currencies || []
    const currencyOptions = buildCurrencySelectOptions(currencyList, [...codesFromDb, ...codesFromDropdown])
    setDropdowns((prev) => ({
      ...prev,
      currencies: currencyOptions.map((o) => o.value),
      currencyOptions
    }))
    return currencyOptions
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const dropdownsRes = await getDropdownOptions()
      await loadCurrencyOptions()
      setDropdowns((prev) => ({
        ...prev,
        timezones: dropdownsRes.timezones || [],
        languages: dropdownsRes.languages || [],
        logLevels: dropdownsRes.logLevels || [],
        backupFrequencies: dropdownsRes.backupFrequencies || []
      }))
      // Fetch settings from API
      const response = await api.get('/settings')
      const apiSettings = response.data.settings || {}

      // Convert flat API structure to nested structure
      const nestedSettings = {
        general: {},
        security: {},
        notifications: {},
        system: {},
        email: {}
      }

      // Map API settings to nested structure
      Object.keys(apiSettings).forEach(category => {
        if (nestedSettings[category]) {
          Object.keys(apiSettings[category]).forEach(key => {
            // Strip category prefix if present (e.g. "email.smtpHost" -> "smtpHost")
            // This ensures the value maps to the correct field in the state
            let fieldName = key;
            if (key.startsWith(`${category}.`)) {
              fieldName = key.substring(category.length + 1);
            }
            let val = apiSettings[category][key]
            if (fieldName === 'spokenLanguageList' && Array.isArray(val)) {
              val = val.join(', ')
            }
            nestedSettings[category][fieldName] = val
          })
        }
      })

      // Merge with defaults - API data takes priority
      setSettings(prev => {
        const merged = { ...prev }
        Object.keys(nestedSettings).forEach(category => {
          merged[category] = {
            ...prev[category],
            ...nestedSettings[category]  // API data overwrites defaults
          }
        })
        return merged
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      // Fallback to localStorage ONLY if API fails
      const savedSettings = localStorage.getItem('adminSettings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings(prev => ({ ...prev, ...parsed }))
        } catch (parseError) {
          console.error('Error parsing localStorage settings:', parseError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (section) => {
    setSaving(true)
    try {
      // Prepare settings for API (flatten nested structure)
      const settingsToSave = section === 'all' ? settings : { [section]: settings[section] }

      // Convert nested structure to flat structure for API
      const flatSettings = {}
      Object.keys(settingsToSave).forEach(category => {
        Object.keys(settingsToSave[category]).forEach(key => {
          let val = settingsToSave[category][key]
          if (key === 'spokenLanguageList' && typeof val === 'string') {
            val = val
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          }
          flatSettings[`${category}.${key}`] = val
        })
      })

      // Save to API
      await api.put('/settings', { settings: flatSettings })

      // Clear localStorage since we're using API as source of truth
      localStorage.removeItem('adminSettings')

      toast.success(
        section === 'all'
          ? 'Settings saved successfully'
          : `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`
      )

      await loadDefaultAgencyAgentOptions(settings.general.defaultAgencyId || undefined)
      await fetchSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      // Only save to localStorage if API fails
      localStorage.setItem('adminSettings', JSON.stringify(settings))
      toast.error(error.response?.data?.message || 'Failed to save settings. Saved to local storage as backup.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const settingsSections = [
    {
      id: 'general',
      title: 'General Settings',
      icon: Globe,
      description: 'Basic system configuration',
      fields: [
        { name: 'siteName', label: 'Site Name', type: 'text' },
        { name: 'siteDescription', label: 'Site Description', type: 'textarea' },
        { name: 'defaultCurrency', label: 'Default Currency', type: 'select', optionsKey: 'currencyOptions' },
        { name: 'timezone', label: 'Timezone', type: 'select', options: dropdowns.timezones },
        { name: 'language', label: 'Site Language', type: 'select', options: dropdowns.languages },
        {
          name: 'spokenLanguageList',
          label: 'Spoken languages (for leads)',
          type: 'textarea',
          hint: 'Comma-separated list shown when selecting spoken languages on leads/inquiries.'
        }
      ]
    },
    {
      id: 'security',
      title: 'Security Settings',
      icon: Shield,
      description: 'Security and authentication configuration',
      fields: [
        { name: 'sessionTimeout', label: 'Session Timeout (minutes)', type: 'number' },
        { name: 'maxLoginAttempts', label: 'Max Login Attempts', type: 'number' },
        { name: 'passwordMinLength', label: 'Password Min Length', type: 'number' },
        { name: 'requireTwoFactor', label: 'Require Two-Factor Auth', type: 'checkbox' },
        { name: 'allowRegistration', label: 'Allow User Registration', type: 'checkbox' }
      ]
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      icon: Bell,
      description: 'Email and system notification preferences',
      fields: [
        { name: 'emailNotifications', label: 'Email Notifications', type: 'checkbox' },
        { name: 'proposalNotifications', label: 'Proposal Notifications', type: 'checkbox' },
        { name: 'userNotifications', label: 'User Notifications', type: 'checkbox' },
        { name: 'systemNotifications', label: 'System Notifications', type: 'checkbox' },
        { name: 'loginAlerts', label: 'Login Security Alerts (Email)', type: 'checkbox' }
      ]
    },
    {
      id: 'system',
      title: 'System Settings',
      icon: Server,
      description: 'System maintenance and debugging options',
      fields: [
        { name: 'maintenanceMode', label: 'Maintenance Mode', type: 'checkbox' },
        { name: 'debugMode', label: 'Debug Mode', type: 'checkbox' },
        { name: 'logLevel', label: 'Log Level', type: 'select', options: dropdowns.logLevels },
        { name: 'backupFrequency', label: 'Backup Frequency', type: 'select', options: dropdowns.backupFrequencies }
      ]
    },
    {
      id: 'email',
      title: 'Email Settings',
      icon: Mail,
      description: 'SMTP and email delivery configuration',
      fields: [
        { name: 'smtpHost', label: 'SMTP Host', type: 'text' },
        { name: 'smtpPort', label: 'SMTP Port', type: 'number' },
        { name: 'smtpUser', label: 'SMTP User', type: 'text' },
        { name: 'smtpPass', label: 'SMTP Password', type: 'password' },
        { name: 'fromEmail', label: 'From Email', type: 'email' },
        { name: 'fromName', label: 'From Name', type: 'text' }
      ]
    }
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure system-wide settings and preferences
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-secondary"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Reset
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div key={section.id} className="card">
              <div className="card-header">
                <div className="flex items-center">
                  <section.icon className="h-6 w-6 text-primary-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.name} className="form-group">
                      {field.type !== 'checkbox' && (
                        <label className="form-label">
                          {field.label}
                        </label>
                      )}
                      {field.type === 'text' && (
                        <input
                          type="text"
                          className="form-input"
                          value={settings[section.id][field.name]}
                          onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                        />
                      )}
                      {field.type === 'email' && (
                        <input
                          type="email"
                          className="form-input"
                          value={settings[section.id][field.name]}
                          onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                        />
                      )}
                      {field.type === 'password' && (
                        <div className="relative">
                          <input
                            type={visiblePasswords[field.name] ? "text" : "password"}
                            className="form-input pr-10"
                            value={settings[section.id][field.name]}
                            onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            onClick={() => togglePasswordVisibility(field.name)}
                          >
                            {visiblePasswords[field.name] ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      )}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          className="form-input"
                          value={settings[section.id][field.name]}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                            handleInputChange(section.id, field.name, isNaN(value) ? 0 : value)
                          }}
                        />
                      )}
                      {field.type === 'textarea' && (
                        <>
                          <textarea
                            className="form-input"
                            rows={3}
                            value={settings[section.id][field.name]}
                            onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                          />
                          {field.hint ? (
                            <p className="mt-1 text-xs text-gray-500">{field.hint}</p>
                          ) : null}
                        </>
                      )}
                      {field.type === 'select' && (
                        <SearchableSelect
                          value={settings[section.id][field.name]}
                          onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                          options={ensureCurrencyInOptions(
                            field.optionsKey && dropdowns[field.optionsKey]?.length
                              ? dropdowns[field.optionsKey]
                              : (field.options || []).map((o) =>
                                  typeof o === 'object' && o !== null
                                    ? { value: o.value, label: o.label ?? String(o.value) }
                                    : { value: o, label: String(o) }
                                ),
                            settings[section.id][field.name]
                          )}
                          placeholder="Select..."
                          buttonClassName="form-input w-full"
                          searchPlaceholder="Search..."
                        />
                      )}
                      {field.type === 'checkbox' && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={settings[section.id][field.name]}
                            onChange={(e) => handleInputChange(section.id, field.name, e.target.checked)}
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            {field.label}
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                  {section.id === 'general' && (
                    <div className="sm:col-span-2 border-t border-gray-100 pt-6 mt-2 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Default agency &amp; agent</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Used only when a customer books a property that has no agency/agent assigned.
                          These records cannot be deleted while set as defaults.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="form-group">
                          <label className="form-label">Default agency</label>
                          <SearchableSelect
                            value={settings.general.defaultAgencyId || ''}
                            onChange={(e) => {
                              const agencyId = e.target.value
                              handleInputChange('general', 'defaultAgencyId', agencyId)
                              handleInputChange('general', 'defaultAgentId', '')
                              loadDefaultAgencyAgentOptions(agencyId || undefined)
                            }}
                            options={[
                              { value: '', label: 'Select default agency…' },
                              ...defaultAgencyAgentOptions.agencies
                            ]}
                            placeholder="Select default agency…"
                            buttonClassName="form-input w-full"
                            searchPlaceholder="Search agency…"
                            disabled={!canEditSettings}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Default agent</label>
                          <SearchableSelect
                            value={settings.general.defaultAgentId || ''}
                            onChange={(e) =>
                              handleInputChange('general', 'defaultAgentId', e.target.value)
                            }
                            options={[
                              { value: '', label: 'Select default agent…' },
                              ...defaultAgencyAgentOptions.agents
                            ]}
                            placeholder={
                              settings.general.defaultAgencyId
                                ? 'Select default agent…'
                                : 'Select default agency first'
                            }
                            buttonClassName="form-input w-full"
                            searchPlaceholder="Search agent…"
                            disabled={!canEditSettings || !settings.general.defaultAgencyId}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Amenities & Categories (Settings Module) */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Property Metadata</h3>
            <p className="text-sm text-gray-500">Manage property types which are used across the site</p>
          </div>
          <div className="card-body space-y-8">
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">Property Types</h4>
              <PropertyTypeManagement />
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">Categories</h4>
              <CategoryManagement />
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-3">Amenities</h4>
              <AmenityManagement />
            </div>
          </div>
        </div>

        {/* Currency (Settings Module) */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Currency</h3>
            <p className="text-sm text-gray-500">Manage supported currencies and INR conversion rates</p>
          </div>
          <div className="card-body">
            <CurrencyManagement onCurrenciesChange={loadCurrencyOptions} />
          </div>
        </div>

        {/* Locations (Settings Module) */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Locations</h3>
            <p className="text-sm text-gray-500">
              Manage country / state / city entries used in property filters and centralized dropdowns
            </p>
          </div>
          <div className="card-body">
            <LocationManagement />
          </div>
        </div>

        {/* System Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">System Information</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Database</div>
                  <div className="text-sm text-gray-500">MongoDB Connected</div>
                </div>
              </div>
              <div className="flex items-center">
                <Server className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Server</div>
                  <div className="text-sm text-gray-500">Node.js Running</div>
                </div>
              </div>
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Active Users</div>
                  <div className="text-sm text-gray-500">2 Online</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {canEditSettings && (
          <div className="flex justify-end border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => handleSave('all')}
              disabled={saving || loading}
              className="btn btn-primary"
            >
              {saving ? (
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              Save
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
