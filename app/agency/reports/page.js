'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Users,
  Package,
  FileText,
  DollarSign,
  Download,
  RefreshCw,
  BarChart3,
  Activity,
  MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToCSV, formatLeadsForExport, formatPropertiesForExport, formatAgentsForExport } from '../../../lib/exportUtils'
import Link from 'next/link'

export default function AgencyReports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    totalProperties: 0,
    totalLeads: 0,
    totalAgents: 0,
    totalPropertyValue: 0,
    propertiesByStatus: {},
    propertiesByType: {},
    propertiesByListingType: {},
    leadsByStatus: {},
    leadsBySource: {},
    leadsByPriority: {},
    recentActivity: [],
    systemStats: {},
    agentPerformance: [],
    propertiesByLocation: {}
  })
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedReport, setSelectedReport] = useState('overview')
  const [exportData, setExportData] = useState({ leads: [], properties: [], agents: [] })

  useEffect(() => {
    if (user && user.agency) {
      fetchReportData()
    }
  }, [selectedPeriod, user])

  const getDateFilter = () => {
    const now = new Date()
    const filters = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }
    return filters[selectedPeriod] || filters['30d']
  }

  const fetchReportData = async () => {
    if (!user || !user.agency) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const dateFilter = getDateFilter()
      const startDate = dateFilter.toISOString().split('T')[0]
      const endDate = new Date().toISOString().split('T')[0]

      // Use optimized stats endpoint with date filtering
      const [statsResponse, agentsResponse] = await Promise.all([
        api.get(`/stats/reports?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: {} })),
        api.get(`/users?role=agent`).catch(() => ({ data: { users: [] } }))
      ])

      const stats = statsResponse.data || {}
      const allAgents = agentsResponse.data.users || []

      // Filter agents by agency
      const agents = allAgents.filter(a =>
        a.agency && (a.agency._id === user.agency || a.agency.toString() === user.agency)
      )

      // For detailed analysis, fetch limited data
      const [propertiesResponse, leadsResponse] = await Promise.all([
        api.get(`/properties?limit=500`).catch(() => ({ data: { properties: [] } })),
        api.get(`/leads?limit=500`).catch(() => ({ data: { leads: [] } }))
      ])

      const allProperties = propertiesResponse.data.properties || []
      const allLeads = leadsResponse.data.leads || []

      // Filter by agency
      const properties = allProperties.filter(p =>
        p.agency && (p.agency._id === user.agency || p.agency.toString() === user.agency)
      )
      const leads = allLeads.filter(l =>
        l.agency && (l.agency._id === user.agency || l.agency.toString() === user.agency)
      )

      // Use server-side calculated stats, fallback to client-side
      const totalPropertyValue = stats.totalPropertyValue || properties.reduce((sum, prop) => {
        if (prop.price?.sale) {
          return sum + (prop.price.sale || 0)
        }
        return sum
      }, 0)

      const propertiesByStatus = stats.propertiesByStatus || properties.reduce((acc, prop) => {
        acc[prop.status] = (acc[prop.status] || 0) + 1
        return acc
      }, {})

      const propertiesByType = stats.propertiesByType || properties.reduce((acc, prop) => {
        acc[prop.propertyType] = (acc[prop.propertyType] || 0) + 1
        return acc
      }, {})

      const propertiesByListingType = stats.propertiesByListingType || properties.reduce((acc, prop) => {
        acc[prop.listingType] = (acc[prop.listingType] || 0) + 1
        return acc
      }, {})

      const leadsByStatus = stats.leadsByStatus || leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      }, {})

      const leadsBySource = stats.leadsBySource || leads.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1
        return acc
      }, {})

      const leadsByPriority = stats.leadsByPriority || leads.reduce((acc, lead) => {
        acc[lead.priority] = (acc[lead.priority] || 0) + 1
        return acc
      }, {})

      const propertiesByLocation = stats.propertiesByLocation || properties.reduce((acc, prop) => {
        const city = prop.location?.city || 'Unknown'
        acc[city] = (acc[city] || 0) + 1
        return acc
      }, {})

      // Agent performance
      const agentPerformance = agents.map(agent => {
        const agentProperties = properties.filter(p =>
          p.agent && (p.agent._id === agent._id || p.agent.toString() === agent._id)
        )
        const agentLeads = leads.filter(l =>
          l.assignedAgent && (l.assignedAgent._id === agent._id || l.assignedAgent.toString() === agent._id)
        )
        const activeLeads = agentLeads.filter(l => ['new', 'contacted', 'site_visit', 'negotiation'].includes(l.status)).length
        const convertedLeads = agentLeads.filter(l => l.status === 'converted').length

        return {
          id: agent._id,
          name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email,
          email: agent.email,
          totalProperties: agentProperties.length,
          activeProperties: agentProperties.filter(p => p.status === 'active').length,
          totalLeads: agentLeads.length,
          activeLeads,
          convertedLeads,
          conversionRate: agentLeads.length > 0 ? ((convertedLeads / agentLeads.length) * 100).toFixed(1) : 0
        }
      })
        .sort((a, b) => b.totalLeads - a.totalLeads)

      // Recent activity
      const recentActivity = [
        ...properties.slice(0, 5).map(p => ({
          type: 'property_added',
          message: `New property: ${p.title}`,
          time: new Date(p.createdAt).toLocaleString(),
          user: p.agent ? `${p.agent.firstName || ''} ${p.agent.lastName || ''}`.trim() : 'System',
          link: `/agency/properties/${p._id}`
        })),
        ...leads.slice(0, 5).map(l => ({
          type: 'lead_created',
          message: `New lead: ${l.contact?.firstName || ''} ${l.contact?.lastName || ''}`.trim(),
          time: new Date(l.createdAt).toLocaleString(),
          user: l.source || 'Website',
          link: `/agency/leads/${l._id}`
        }))
      ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10)

      setExportData({
        leads,
        properties,
        agents
      })

      setReportData({
        totalProperties: properties.length,
        totalLeads: leads.length,
        totalAgents: agents.length,
        totalPropertyValue,
        propertiesByStatus,
        propertiesByType,
        propertiesByListingType,
        leadsByStatus,
        leadsBySource,
        leadsByPriority,
        propertiesByLocation,
        agentPerformance,
        recentActivity,
        systemStats: {
          activeProperties: properties.filter(p => p.status === 'active').length,
          pendingProperties: properties.filter(p => p.status === 'pending').length,
          soldProperties: properties.filter(p => p.status === 'sold').length,
          rentedProperties: properties.filter(p => p.status === 'rented').length,
          newLeads: leads.filter(l => l.status === 'new').length,
          convertedLeads: leads.filter(l => l.status === 'converted').length
        }
      })
    } catch (error) {
      console.error('Failed to fetch report data:', error)
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = (reportType) => {
    try {
      switch (reportType) {
        case 'leads':
          if (exportData.leads.length === 0) {
            toast.error('No leads data to export')
            return
          }
          exportToCSV(formatLeadsForExport(exportData.leads), `leads-export-${new Date().toISOString().split('T')[0]}.csv`)
          break
        case 'properties':
          if (exportData.properties.length === 0) {
            toast.error('No properties data to export')
            return
          }
          exportToCSV(formatPropertiesForExport(exportData.properties), `properties-export-${new Date().toISOString().split('T')[0]}.csv`)
          break
        case 'agents':
          if (exportData.agents.length === 0) {
            toast.error('No agents data to export')
            return
          }
          exportToCSV(formatAgentsForExport(exportData.agents), `agents-export-${new Date().toISOString().split('T')[0]}.csv`)
          break
        default:
          toast.error('Invalid report type')
          return
      }
      toast.success(`${reportType} report exported successfully!`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export report')
    }
  }

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'properties', name: 'Properties', icon: Package },
    { id: 'leads', name: 'Leads', icon: FileText },
    { id: 'agents', name: 'Agents', icon: Users },
    { id: 'activity', name: 'Activity', icon: Activity }
  ]

  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ]

  if (!user || !user.agency) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Agency Required</h3>
              <p className="text-yellow-700">
                Your account is not associated with an agency. Please contact the administrator.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Agency Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Analytics and performance reports for your agency
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="form-input"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={fetchReportData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`p-4 rounded-lg border-2 transition-colors ${selectedReport === report.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <report.icon className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">{report.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overview Report */}
        {selectedReport === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Properties</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{reportData.totalProperties}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-purple-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{reportData.totalLeads}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Agents</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{reportData.totalAgents}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Property Value</dt>
                        <dd className="text-2xl font-semibold text-gray-900">${reportData.totalPropertyValue.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Properties by Status</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.propertiesByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">{status}</span>
                        </div>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Leads by Status</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.leadsByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">{status.replace('_', ' ')}</span>
                        </div>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Top Locations</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.propertiesByLocation)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([city, count]) => (
                        <div key={city} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{city}</span>
                          </div>
                          <span className="text-sm text-gray-500">{count} properties</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* System Statistics */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Agency Statistics</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Active Properties</span>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.activeProperties}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Pending Properties</span>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.pendingProperties}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Sold Properties</span>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.soldProperties}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Rented Properties</span>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.rentedProperties}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">New Leads</span>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.newLeads}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Converted Leads</span>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.convertedLeads}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">Conversion Rate</span>
                    <p className="text-2xl font-semibold text-gray-900">
                      {reportData.totalLeads > 0
                        ? ((reportData.systemStats.convertedLeads / reportData.totalLeads) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="card-body">
                <div className="flow-root">
                  <ul className="-my-5 divide-y divide-gray-200">
                    {reportData.recentActivity.length > 0 ? (
                      reportData.recentActivity.map((activity, index) => (
                        <li key={index} className="py-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <Activity className="h-4 w-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              {activity.link ? (
                                <Link href={activity.link} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                  {activity.message}
                                </Link>
                              ) : (
                                <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                              )}
                              <p className="text-sm text-gray-500">by {activity.user}</p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="text-sm text-gray-500">{activity.time}</span>
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="py-4 text-center text-gray-500">No recent activity</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Property Reports */}
        {selectedReport === 'properties' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Properties by Status</h3>
                  <button
                    onClick={() => handleExportReport('properties')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.propertiesByStatus).map(([status, count]) => {
                      const percentage = ((count / reportData.totalProperties) * 100).toFixed(1)
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 capitalize">{status}</span>
                            <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Properties by Type</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.propertiesByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Properties by Listing Type</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.propertiesByListingType).map(([type, count]) => {
                      const percentage = ((count / reportData.totalProperties) * 100).toFixed(1)
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                            <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Property Statistics</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Total Properties</span>
                      <span className="text-2xl font-semibold text-gray-900">{reportData.totalProperties}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Active Properties</span>
                      <span className="text-2xl font-semibold text-green-600">{reportData.systemStats.activeProperties}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Sold Properties</span>
                      <span className="text-2xl font-semibold text-blue-600">{reportData.systemStats.soldProperties}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Rented Properties</span>
                      <span className="text-2xl font-semibold text-purple-600">{reportData.systemStats.rentedProperties}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Total Property Value</span>
                      <span className="text-2xl font-semibold text-gray-900">${reportData.totalPropertyValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Lead Analytics */}
        {selectedReport === 'leads' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Leads by Status</h3>
                  <button
                    onClick={() => handleExportReport('leads')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.leadsByStatus).map(([status, count]) => {
                      const percentage = ((count / reportData.totalLeads) * 100).toFixed(1)
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 capitalize">{status.replace('_', ' ')}</span>
                            <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Leads by Source</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.leadsBySource).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 capitalize">{source}</span>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Leads by Priority</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.leadsByPriority).map(([priority, count]) => {
                      const percentage = ((count / reportData.totalLeads) * 100).toFixed(1)
                      const color = priority === 'high' ? 'bg-red-600' : priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                      return (
                        <div key={priority}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 capitalize">{priority}</span>
                            <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${color} h-2 rounded-full`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Lead Statistics</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Total Leads</span>
                      <span className="text-2xl font-semibold text-gray-900">{reportData.totalLeads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">New Leads</span>
                      <span className="text-2xl font-semibold text-blue-600">{reportData.systemStats.newLeads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Converted Leads</span>
                      <span className="text-2xl font-semibold text-green-600">{reportData.systemStats.convertedLeads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Conversion Rate</span>
                      <span className="text-2xl font-semibold text-gray-900">
                        {reportData.totalLeads > 0
                          ? ((reportData.systemStats.convertedLeads / reportData.totalLeads) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Agent Performance */}
        {selectedReport === 'agents' && (
          <>
            <div className="card">
              <div className="card-header flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Agent Performance</h3>
                <button
                  onClick={() => handleExportReport('agents')}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
              <div className="card-body">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Properties</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leads</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Leads</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.agentPerformance.length > 0 ? (
                        reportData.agentPerformance.map((agent) => (
                          <tr key={agent.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                <div className="text-sm text-gray-500">{agent.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.totalProperties}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.activeProperties}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.totalLeads}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.activeLeads}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{agent.convertedLeads}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.conversionRate}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No agent data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Activity Logs */}
        {selectedReport === 'activity' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="card-body">
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {reportData.recentActivity.length > 0 ? (
                    reportData.recentActivity.map((activity, index) => (
                      <li key={index} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${activity.type === 'property_added' ? 'bg-green-100' : 'bg-purple-100'
                              }`}>
                              {activity.type === 'property_added' ? (
                                <Package className="h-4 w-4 text-green-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-purple-600" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            {activity.link ? (
                              <Link href={activity.link} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                {activity.message}
                              </Link>
                            ) : (
                              <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                            )}
                            <p className="text-sm text-gray-500">by {activity.user}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-sm text-gray-500">{activity.time}</span>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="py-4 text-center text-gray-500">No recent activity</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

