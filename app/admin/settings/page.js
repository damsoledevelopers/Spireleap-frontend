'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Settings,
  Save,
  RefreshCw,
  Database,
  Mail,
  Shield,
  Bell,
  Globe,
  Key,
  User,
  Server
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    general: {
      siteName: 'SPIRELEAP Real Estate',
      siteDescription: 'Real Estate CRM & CMS System',
      defaultCurrency: 'USD',
      timezone: 'UTC',
      language: 'en'
    },
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      fromEmail: 'noreply@spireleap.com',
      fromName: 'SPIRELEAP Real Estate'
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
      systemNotifications: true
    },
    system: {
      maintenanceMode: false,
      debugMode: false,
      logLevel: 'info',
      backupFrequency: 'daily'
    }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      // Fetch settings from API
      const response = await api.get('/settings')
      const apiSettings = response.data.settings || {}
      
      // Convert flat API structure to nested structure
      const nestedSettings = {
        general: {},
        email: {},
        security: {},
        notifications: {},
        system: {}
      }
      
      // Map API settings to nested structure
      Object.keys(apiSettings).forEach(category => {
        if (nestedSettings[category]) {
          Object.keys(apiSettings[category]).forEach(key => {
            nestedSettings[category][key] = apiSettings[category][key]
          })
        }
      })
      
      // Merge with defaults
      setSettings(prev => ({
        ...prev,
        ...nestedSettings
      }))
      
      // Also try localStorage as fallback for any missing values
      const savedSettings = localStorage.getItem('adminSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      // Fallback to localStorage if API fails
      const savedSettings = localStorage.getItem('adminSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
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
          flatSettings[`${category}.${key}`] = settingsToSave[category][key]
        })
      })
      
      // Save to API
      await api.put('/settings', { settings: flatSettings })
      
      // Also save to localStorage as backup
      localStorage.setItem('adminSettings', JSON.stringify(settings))
      
      toast.success(`${section === 'all' ? 'All' : section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`)
      
      // Refresh settings after save
      await fetchSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      // Fallback to localStorage if API fails
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
        { name: 'defaultCurrency', label: 'Default Currency', type: 'select', options: ['AED', 'USD', 'INR'] },
        { name: 'timezone', label: 'Timezone', type: 'select', options: ['UTC', 'EST', 'PST', 'GMT'] },
        { name: 'language', label: 'Language', type: 'select', options: ['en', 'es', 'fr', 'de'] }
      ]
    },
    {
      id: 'email',
      title: 'Email Settings',
      icon: Mail,
      description: 'SMTP configuration for email notifications',
      fields: [
        { name: 'smtpHost', label: 'SMTP Host', type: 'text' },
        { name: 'smtpPort', label: 'SMTP Port', type: 'number' },
        { name: 'smtpUser', label: 'SMTP Username', type: 'text' },
        { name: 'smtpPass', label: 'SMTP Password', type: 'password' },
        { name: 'fromEmail', label: 'From Email', type: 'email' },
        { name: 'fromName', label: 'From Name', type: 'text' }
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
        { name: 'systemNotifications', label: 'System Notifications', type: 'checkbox' }
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
        { name: 'logLevel', label: 'Log Level', type: 'select', options: ['debug', 'info', 'warn', 'error'] },
        { name: 'backupFrequency', label: 'Backup Frequency', type: 'select', options: ['hourly', 'daily', 'weekly', 'monthly'] }
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
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-secondary"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Reset
            </button>
            <button
              onClick={() => handleSave('all')}
              disabled={saving || loading}
              className="btn btn-primary"
            >
              {saving ? (
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              Save All
            </button>
          </div>
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
                <button
                  onClick={() => handleSave(section.id)}
                  disabled={saving || loading}
                  className="btn btn-primary btn-sm"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </button>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.name} className="form-group">
                      <label className="form-label">
                        {field.label}
                      </label>
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
                        <input
                          type="password"
                          className="form-input"
                          value={settings[section.id][field.name]}
                          onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                        />
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
                        <textarea
                          className="form-input"
                          rows={3}
                          value={settings[section.id][field.name]}
                          onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          className="form-input"
                          value={settings[section.id][field.name]}
                          onChange={(e) => handleInputChange(section.id, field.name, e.target.value)}
                        >
                          {field.options.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
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
                </div>
              </div>
            </div>
          ))}
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
      </div>
    </DashboardLayout>
  )
}

