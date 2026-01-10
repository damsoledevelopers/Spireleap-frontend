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
  MapPin,
  UserCheck,
  Building,
  TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToCSV, formatLeadsForExport, formatPropertiesForExport, formatAgentsForExport } from '../../../lib/exportUtils'
import Link from 'next/link'
import LeadFunnelChart from '../../../components/Reports/Charts/LeadFunnelChart'
import LeadSourceChart from '../../../components/Reports/Charts/LeadSourceChart'
import AgentPerformanceChart from '../../../components/Reports/Charts/AgentPerformanceChart'
import RevenueChart from '../../../components/Reports/Charts/RevenueChart'

export default function AdminReports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    totalUsers: 0,
    totalProperties: 0,
    totalLeads: 0,
    totalAgencies: 0,
    totalPropertyValue: 0,
    usersByRole: {},
    propertiesByStatus: {},
    propertiesByType: {},
    propertiesByListingType: {},
    leadsByStatus: {},
    leadsBySource: {},
    leadsByPriority: {},
    recentActivity: [],
    systemStats: {},
    agentPerformance: [],
    propertiesByLocation: {},
    agencyAnalysis: [],
    campaignROI: [],
    followUpCompliance: {},
    siteVisitConversion: {},
    lostReasons: {}
  })
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedReport, setSelectedReport] = useState('overview')
  const [exportData, setExportData] = useState({ leads: [], properties: [], agents: [] })
  const [allData, setAllData] = useState({ users: [], properties: [], leads: [], agencies: [] })
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [agencySearch, setAgencySearch] = useState('')

  useEffect(() => {
    fetchReportData()
  }, [selectedPeriod])

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
    setLoading(true)
    try {
      const dateFilter = getDateFilter()
      const startDate = dateFilter.toISOString().split('T')[0]
      const endDate = new Date().toISOString().split('T')[0]

      // Use optimized stats endpoint with date filtering
      const [statsResponse, agenciesResponse] = await Promise.all([
        api.get(`/stats/reports?startDate=${startDate}&endDate=${endDate}`).catch(() => ({ data: {} })),
        api.get('/agencies').catch(() => ({ data: { agencies: [] } }))
      ])

      const stats = statsResponse.data || {}
      const agencies = agenciesResponse.data.agencies || []

      // For detailed analysis, fetch limited data (only what's needed)
      const [usersResponse, propertiesResponse, leadsResponse] = await Promise.all([
        api.get('/users?limit=500').catch(() => ({ data: { users: [] } })),
        api.get('/properties?limit=500').catch(() => ({ data: { properties: [] } })),
        api.get('/leads?limit=500').catch(() => ({ data: { leads: [] } }))
      ])

      const users = usersResponse.data.users || []
      const properties = propertiesResponse.data.properties || []
      const leads = leadsResponse.data.leads || []

      setAllData({ users, properties, leads, agencies })

      // Use server-side filtered stats
      const filteredProperties = properties.filter(p => {
        const createdAt = new Date(p.createdAt)
        return createdAt >= dateFilter
      })
      const filteredLeads = leads.filter(l => {
        const createdAt = new Date(l.createdAt)
        return createdAt >= dateFilter
      })
      const filteredUsers = users.filter(u => {
        const createdAt = new Date(u.createdAt)
        return createdAt >= dateFilter
      })

      // Use filtered data for period-based calculations
      const dataToUse = {
        properties: filteredProperties,
        leads: filteredLeads,
        users: filteredUsers
      }

      // Use server-side calculated stats, fallback to client-side for limited data
      const totalPropertyValue = stats.totalPropertyValue || dataToUse.properties.reduce((sum, prop) => {
        if (prop.price?.sale) {
          return sum + (prop.price.sale || 0)
        }
        return sum
      }, 0)

      // Use server-side stats when available
      const usersByRole = stats.usersByRole || dataToUse.users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {})

      const propertiesByStatus = stats.propertiesByStatus || dataToUse.properties.reduce((acc, prop) => {
        acc[prop.status] = (acc[prop.status] || 0) + 1
        return acc
      }, {})

      const propertiesByType = stats.propertiesByType || dataToUse.properties.reduce((acc, prop) => {
        acc[prop.propertyType] = (acc[prop.propertyType] || 0) + 1
        return acc
      }, {})

      const propertiesByListingType = stats.propertiesByListingType || dataToUse.properties.reduce((acc, prop) => {
        acc[prop.listingType] = (acc[prop.listingType] || 0) + 1
        return acc
      }, {})

      const leadsByStatus = stats.leadsByStatus || dataToUse.leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1
        return acc
      }, {})

      const leadsBySource = stats.leadsBySource || dataToUse.leads.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1
        return acc
      }, {})

      const leadsByPriority = stats.leadsByPriority || dataToUse.leads.reduce((acc, lead) => {
        acc[lead.priority] = (acc[lead.priority] || 0) + 1
        return acc
      }, {})

      const propertiesByLocation = stats.propertiesByLocation || dataToUse.properties.reduce((acc, prop) => {
        const city = prop.location?.city || 'Unknown'
        acc[city] = (acc[city] || 0) + 1
        return acc
      }, {})

      // Agent performance - using filtered data
      const agentPerformance = dataToUse.users
        .filter(u => u.role === 'agent')
        .map(agent => {
          const agentProperties = dataToUse.properties.filter(p => 
            p.agent && (p.agent._id === agent._id || p.agent.toString() === agent._id)
          )
          const agentLeads = dataToUse.leads.filter(l => 
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

      // Agency Analysis with Health Score - using filtered data
      const agencyAnalysis = agencies.map(agency => {
        const agencyId = agency._id?.toString() || agency._id
        const agencyProperties = dataToUse.properties.filter(p => {
          const propAgencyId = p.agency?._id?.toString() || p.agency?.toString() || p.agency
          return propAgencyId === agencyId
        })
        const agencyLeads = dataToUse.leads.filter(l => {
          const leadAgencyId = l.agency?._id?.toString() || l.agency?.toString() || l.agency
          return leadAgencyId === agencyId
        })
        const agencyAgents = dataToUse.users.filter(u => {
          const userAgencyId = u.agency?._id?.toString() || u.agency?.toString() || u.agency
          return userAgencyId === agencyId && u.role === 'agent'
        })
        
        const activeProperties = agencyProperties.filter(p => p.status === 'active').length
        const soldProperties = agencyProperties.filter(p => p.status === 'sold').length
        const rentedProperties = agencyProperties.filter(p => p.status === 'rented').length
        const newLeads = agencyLeads.filter(l => l.status === 'new').length
        const convertedLeads = agencyLeads.filter(l => l.status === 'converted').length
        const activeLeads = agencyLeads.filter(l => ['new', 'contacted', 'site_visit', 'negotiation'].includes(l.status)).length
        
        const totalPropertyValue = agencyProperties.reduce((sum, prop) => {
          if (prop.price?.sale) {
            return sum + (prop.price.sale || 0)
          }
          return sum
        }, 0)

        const conversionRate = agencyLeads.length > 0 
          ? ((convertedLeads / agencyLeads.length) * 100).toFixed(1) 
          : 0

        // Calculate Health Status
        let healthStatus = 'poor'
        let healthLabel = 'Poor'
        if (agency.isActive && agencyAgents.length > 0 && agencyLeads.length > 5) {
          healthStatus = 'good'
          healthLabel = 'Good'
        } else if (agency.isActive && (agencyAgents.length > 0 || agencyLeads.length > 0)) {
          healthStatus = 'average'
          healthLabel = 'Average'
        }

        // Calculate Last Activity (most recent lead or property creation)
        const lastLeadDate = agencyLeads.length > 0 
          ? Math.max(...agencyLeads.map(l => new Date(l.createdAt).getTime()))
          : null
        const lastPropertyDate = agencyProperties.length > 0
          ? Math.max(...agencyProperties.map(p => new Date(p.createdAt).getTime()))
          : null
        const lastActivityDate = lastLeadDate || lastPropertyDate || null
        const daysSinceActivity = lastActivityDate 
          ? Math.floor((Date.now() - lastActivityDate) / (1000 * 60 * 60 * 24))
          : null

        return {
          id: agencyId,
          name: agency.name || 'Unknown Agency',
          email: agency.contact?.email || '-',
          phone: agency.contact?.phone || '-',
          logo: agency.logo || null,
          isActive: agency.isActive || false,
          totalProperties: agencyProperties.length,
          activeProperties,
          soldProperties,
          rentedProperties,
          totalLeads: agencyLeads.length,
          newLeads,
          activeLeads,
          convertedLeads,
          conversionRate,
          totalAgents: agencyAgents.length,
          activeAgents: agencyAgents.filter(a => a.isActive).length,
          totalPropertyValue,
          healthStatus,
          healthLabel,
          lastActivityDate,
          daysSinceActivity,
          hasNoAgents: agencyAgents.length === 0,
          hasNoLeads: agencyLeads.length === 0
        }
      }).sort((a, b) => b.totalLeads - a.totalLeads)

      // Recent activity - using filtered data
      const recentActivity = [
        ...dataToUse.properties.slice(0, 5).map(p => ({
          type: 'property_added',
          message: `New property: ${p.title}`,
          time: new Date(p.createdAt).toLocaleString(),
          user: p.agent ? `${p.agent.firstName || ''} ${p.agent.lastName || ''}`.trim() : 'System',
          link: `/admin/properties/${p._id}`
        })),
        ...dataToUse.leads.slice(0, 5).map(l => ({
          type: 'lead_created',
          message: `New lead: ${l.contact?.firstName || ''} ${l.contact?.lastName || ''}`.trim(),
          time: new Date(l.createdAt).toLocaleString(),
          user: l.source || 'Website',
          link: `/admin/leads/${l._id}`
        }))
      ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10)

      setExportData({
        leads,
        properties,
        agents: users.filter(u => u.role === 'agent')
      })

      // Calculate total property value for ALL properties (not filtered)
      const totalPropertyValueAll = properties.reduce((sum, prop) => {
        if (prop.price?.sale) {
          return sum + (prop.price.sale || 0)
        }
        return sum
      }, 0)

      // Campaign ROI Analysis
      const campaignROI = leads.reduce((acc, lead) => {
        const campaign = lead.campaignName || 'No Campaign'
        if (!acc[campaign]) {
          acc[campaign] = {
            name: campaign,
            totalLeads: 0,
            convertedLeads: 0,
            revenue: 0,
            cost: 0
          }
        }
        acc[campaign].totalLeads++
        if (lead.status === 'booked' || lead.status === 'closed') {
          acc[campaign].convertedLeads++
          // Estimate revenue from property price if available
          if (lead.property && lead.property.price) {
            const price = lead.property.price.sale || lead.property.price || 0
            acc[campaign].revenue += price
          }
        }
        return acc
      }, {})

      // Follow-up Compliance Analysis
      const followUpCompliance = {
        totalLeadsWithFollowUp: leads.filter(l => l.followUpDate).length,
        totalFollowUpsCompleted: leads.filter(l => {
          if (!l.followUpDate) return false
          const followUpDate = new Date(l.followUpDate)
          const now = new Date()
          return followUpDate <= now && (l.status !== 'new' || l.communications?.length > 0)
        }).length,
        overdueFollowUps: leads.filter(l => {
          if (!l.followUpDate) return false
          const followUpDate = new Date(l.followUpDate)
          const now = new Date()
          return followUpDate < now && (l.status === 'new' && (!l.communications || l.communications.length === 0))
        }).length,
        upcomingFollowUps: leads.filter(l => {
          if (!l.followUpDate) return false
          const followUpDate = new Date(l.followUpDate)
          const now = new Date()
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          return followUpDate >= now && followUpDate <= tomorrow
        }).length,
        complianceRate: 0
      }
      if (followUpCompliance.totalLeadsWithFollowUp > 0) {
        followUpCompliance.complianceRate = ((followUpCompliance.totalFollowUpsCompleted / followUpCompliance.totalLeadsWithFollowUp) * 100).toFixed(1)
      }

      // Site Visit Conversion Analysis
      const siteVisitConversion = {
        totalScheduled: leads.filter(l => l.siteVisit?.scheduledDate || l.status === 'site_visit_scheduled').length,
        totalCompleted: leads.filter(l => l.siteVisit?.status === 'completed' || l.status === 'site_visit_completed').length,
        totalNoShow: leads.filter(l => l.siteVisit?.status === 'no_show').length,
        totalCancelled: leads.filter(l => l.siteVisit?.status === 'cancelled').length,
        convertedFromVisit: leads.filter(l => {
          return (l.siteVisit?.status === 'completed' || l.status === 'site_visit_completed') && 
                 (l.status === 'booked' || l.status === 'closed' || l.status === 'negotiation')
        }).length,
        conversionRate: 0,
        showUpRate: 0
      }
      if (siteVisitConversion.totalScheduled > 0) {
        siteVisitConversion.conversionRate = ((siteVisitConversion.convertedFromVisit / siteVisitConversion.totalScheduled) * 100).toFixed(1)
        siteVisitConversion.showUpRate = (((siteVisitConversion.totalCompleted) / siteVisitConversion.totalScheduled) * 100).toFixed(1)
      }

      // Lost Reasons Analysis
      const lostReasons = leads
        .filter(l => l.status === 'lost' && l.lostReason)
        .reduce((acc, lead) => {
          const reason = lead.lostReason || 'Not Specified'
          acc[reason] = (acc[reason] || 0) + 1
          return acc
        }, {})

      setReportData({
        totalUsers: users.length, // Show all users, not filtered
        totalProperties: properties.length, // Show all properties, not filtered
        totalLeads: leads.length, // Show all leads, not filtered
        totalAgencies: agencies.length,
        totalPropertyValue: totalPropertyValueAll, // Use all properties for total value
        usersByRole,
        propertiesByStatus,
        propertiesByType,
        propertiesByListingType,
        leadsByStatus,
        leadsBySource,
        leadsByPriority,
        propertiesByLocation,
        agentPerformance,
        agencyAnalysis,
        recentActivity,
        campaignROI: Object.values(campaignROI),
        followUpCompliance,
        siteVisitConversion,
        lostReasons,
        systemStats: {
          activeUsers: users.filter(u => u.isActive).length, // All users
          inactiveUsers: users.filter(u => !u.isActive).length, // All users
          activeProperties: properties.filter(p => p.status === 'active').length, // All properties
          pendingProperties: properties.filter(p => p.status === 'pending').length, // All properties
          soldProperties: properties.filter(p => p.status === 'sold').length, // All properties
          rentedProperties: properties.filter(p => p.status === 'rented').length, // All properties
          newLeads: leads.filter(l => l.status === 'new').length, // All leads
          convertedLeads: leads.filter(l => l.status === 'converted').length // All leads
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
    { id: 'overview', name: 'System Overview', icon: BarChart3 },
    { id: 'users', name: 'User Analytics', icon: Users },
    { id: 'properties', name: 'Property Reports', icon: Package },
    { id: 'leads', name: 'Lead Analytics', icon: FileText },
    { id: 'lead_funnel', name: 'Lead Funnel', icon: TrendingUp },
    { id: 'campaign_roi', name: 'Campaign ROI', icon: DollarSign },
    { id: 'followup', name: 'Follow-up Compliance', icon: Activity },
    { id: 'site_visit', name: 'Site Visit Conversion', icon: MapPin },
    { id: 'lost_reasons', name: 'Lost Reasons', icon: FileText },
    { id: 'agents', name: 'Agent Performance', icon: UserCheck },
    { id: 'agencies', name: 'Agency Analysis', icon: Building },
    { id: 'activity', name: 'Activity Logs', icon: Activity }
  ]

  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ]

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
            <h1 className="text-2xl font-bold text-gray-900">Real Estate Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive analytics and performance reports for SPIRELEAP Real Estate
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
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`p-5 rounded-xl border-2 ${
                    selectedReport === report.id
                      ? 'border-green-500 bg-white text-gray-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 rounded-lg bg-gray-100 text-gray-600">
                      <report.icon className="h-6 w-6" />
                    </div>
                    <div className="text-xs font-semibold text-center leading-tight text-gray-700">
                      {report.name}
                    </div>
                  </div>
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
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{reportData.totalUsers}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

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
                  <h3 className="text-lg font-medium text-gray-900">Users by Role</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.usersByRole).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">{role.replace('_', ' ')}</span>
                        </div>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

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
            </div>

            {/* System Statistics */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">System Statistics</h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-900">Active Users</span>
                      <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.activeUsers}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">Inactive Users</span>
                      <p className="text-2xl font-semibold text-gray-900">{reportData.systemStats.inactiveUsers}</p>
                    </div>
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

        {/* User Analytics Report */}
        {selectedReport === 'users' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Users by Role</h3>
                  <button
                    onClick={() => handleExportReport('agents')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {Object.entries(reportData.usersByRole).map(([role, count]) => {
                      const percentage = ((count / reportData.totalUsers) * 100).toFixed(1)
                      return (
                        <div key={role}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 capitalize">{role.replace('_', ' ')}</span>
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
                  <h3 className="text-lg font-medium text-gray-900">User Statistics</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Total Users</span>
                      <span className="text-2xl font-semibold text-gray-900">{reportData.totalUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Active Users</span>
                      <span className="text-2xl font-semibold text-green-600">{reportData.systemStats.activeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Inactive Users</span>
                      <span className="text-2xl font-semibold text-red-600">{reportData.systemStats.inactiveUsers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Total Agencies</span>
                      <span className="text-2xl font-semibold text-gray-900">{reportData.totalAgencies}</span>
                    </div>
                  </div>
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
                  <LeadSourceChart data={reportData.leadsBySource} />
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
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Agent Performance Chart</h3>
              </div>
              <div className="card-body">
                <AgentPerformanceChart data={reportData.agentPerformance} />
              </div>
            </div>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Properties</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Active Properties</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Leads</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Active Leads</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Converted</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Conversion Rate</th>
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

        {/* Agency Analysis */}
        {selectedReport === 'agencies' && (() => {
          // Filter agencies based on selected filter
          let filteredAgencies = reportData.agencyAnalysis
          
          if (agencyFilter === 'no-agents') {
            filteredAgencies = filteredAgencies.filter(a => a.hasNoAgents)
          } else if (agencyFilter === 'no-leads') {
            filteredAgencies = filteredAgencies.filter(a => a.hasNoLeads)
          } else if (agencyFilter === 'poor-health') {
            filteredAgencies = filteredAgencies.filter(a => a.healthStatus === 'poor')
          } else if (agencyFilter === 'inactive-30d') {
            filteredAgencies = filteredAgencies.filter(a => a.daysSinceActivity !== null && a.daysSinceActivity >= 30)
          } else if (agencyFilter === 'active') {
            filteredAgencies = filteredAgencies.filter(a => a.isActive)
          }

          // Apply search filter
          if (agencySearch.trim()) {
            const searchLower = agencySearch.toLowerCase()
            filteredAgencies = filteredAgencies.filter(a => 
              a.name.toLowerCase().includes(searchLower) ||
              a.email.toLowerCase().includes(searchLower) ||
              a.phone.includes(searchLower)
            )
          }

          // Calculate summary stats
          const totalAgencies = reportData.agencyAnalysis.length
          const activeAgencies = reportData.agencyAnalysis.filter(a => a.isActive).length
          const agenciesWithoutAgents = reportData.agencyAnalysis.filter(a => a.hasNoAgents).length
          const agenciesWithNoLeads = reportData.agencyAnalysis.filter(a => a.hasNoLeads).length

          // Prepare chart data
          const leadsChartData = [...reportData.agencyAnalysis]
            .sort((a, b) => b.totalLeads - a.totalLeads)
            .slice(0, 10)
          const maxLeads = Math.max(...leadsChartData.map(a => a.totalLeads), 1)

          return (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => setAgencyFilter('all')}
                  className={`card cursor-pointer transition-all hover:shadow-lg ${agencyFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Building className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Agencies</dt>
                          <dd className="text-2xl font-semibold text-gray-900">{totalAgencies}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAgencyFilter('active')}
                  className={`card cursor-pointer transition-all hover:shadow-lg ${agencyFilter === 'active' ? 'ring-2 ring-green-500' : ''}`}
                >
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Activity className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Agencies</dt>
                          <dd className="text-2xl font-semibold text-gray-900">
                            {activeAgencies} <span className="text-sm text-gray-500">/ {totalAgencies}</span>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAgencyFilter('no-agents')}
                  className={`card cursor-pointer transition-all hover:shadow-lg ${agencyFilter === 'no-agents' ? 'ring-2 ring-orange-500' : ''}`}
                >
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCheck className="h-8 w-8 text-orange-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Needs Setup</dt>
                          <dd className="text-2xl font-semibold text-orange-600">{agenciesWithoutAgents}</dd>
                          <dd className="text-xs text-gray-500 mt-1">Agencies without agents</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setAgencyFilter('no-leads')}
                  className={`card cursor-pointer transition-all hover:shadow-lg ${agencyFilter === 'no-leads' ? 'ring-2 ring-red-500' : ''}`}
                >
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-red-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">No Leads</dt>
                          <dd className="text-2xl font-semibold text-red-600">{agenciesWithNoLeads}</dd>
                          <dd className="text-xs text-gray-500 mt-1">Agencies with zero leads</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Analytics Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">Leads per Agency</h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      {leadsChartData.map((agency) => {
                        const percentage = (agency.totalLeads / maxLeads) * 100
                        return (
                          <button
                            key={agency.id}
                            onClick={() => {
                              setAgencySearch(agency.name)
                              setAgencyFilter('all')
                            }}
                            className="w-full text-left group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                                {agency.name}
                              </span>
                              <span className="text-sm text-gray-500">{agency.totalLeads}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-blue-600 h-3 rounded-full transition-all group-hover:bg-blue-700"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">Agents vs Leads Comparison</h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      {leadsChartData.map((agency) => {
                        const maxValue = Math.max(agency.totalAgents, agency.totalLeads, 1)
                        const agentsPercentage = (agency.totalAgents / maxValue) * 100
                        const leadsPercentage = (agency.totalLeads / maxValue) * 100
                        return (
                          <button
                            key={agency.id}
                            onClick={() => {
                              setAgencySearch(agency.name)
                              setAgencyFilter('all')
                            }}
                            className="w-full text-left group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                                {agency.name}
                              </span>
                              <div className="flex gap-2 text-xs">
                                <span className="text-green-600">{agency.totalAgents} agents</span>
                                <span className="text-blue-600">{agency.totalLeads} leads</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                              <div
                                className="bg-green-500 h-3 rounded-l-full"
                                style={{ width: `${agentsPercentage}%` }}
                              ></div>
                              <div
                                className="bg-blue-500 h-3 absolute top-0 left-0 rounded-r-full"
                                style={{ width: `${leadsPercentage}%` }}
                              ></div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="card">
                <div className="card-body">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAgencyFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          agencyFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setAgencyFilter('no-agents')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          agencyFilter === 'no-agents'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        No Agents
                      </button>
                      <button
                        onClick={() => setAgencyFilter('no-leads')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          agencyFilter === 'no-leads'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        No Leads
                      </button>
                      <button
                        onClick={() => setAgencyFilter('poor-health')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          agencyFilter === 'poor-health'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Poor Health
                      </button>
                      <button
                        onClick={() => setAgencyFilter('inactive-30d')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          agencyFilter === 'inactive-30d'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Inactive 30+ Days
                      </button>
                      <button
                        onClick={() => setAgencyFilter('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          agencyFilter === 'active'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Active Only
                      </button>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search agencies..."
                        value={agencySearch}
                        onChange={(e) => setAgencySearch(e.target.value)}
                        className="form-input flex-1 sm:flex-none sm:w-64"
                      />
                      <button
                        onClick={() => {
                          const agencyData = filteredAgencies.map(agency => ({
                            'Agency Name': agency.name,
                            'Email': agency.email,
                            'Phone': agency.phone,
                            'Health Status': agency.healthLabel,
                            'Status': agency.isActive ? 'Active' : 'Inactive',
                            'Last Activity': agency.daysSinceActivity !== null ? `${agency.daysSinceActivity} days ago` : 'Never',
                            'Total Properties': agency.totalProperties,
                            'Active Properties': agency.activeProperties,
                            'Total Leads': agency.totalLeads,
                            'Converted Leads': agency.convertedLeads,
                            'Conversion Rate (%)': agency.conversionRate,
                            'Total Agents': agency.totalAgents,
                            'Active Agents': agency.activeAgents,
                            'Total Property Value': `$${agency.totalPropertyValue.toLocaleString()}`
                          }))
                          exportToCSV(agencyData, `agencies-analysis-${new Date().toISOString().split('T')[0]}.csv`)
                          toast.success('Agency analysis exported successfully!')
                        }}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Agencies Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Agencies Overview</h3>
                </div>
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-primary-600 to-primary-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Logo</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Agency Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Phone</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Health Status</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Agents
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Properties
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                            Leads
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Last Activity</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAgencies.length > 0 ? (
                          filteredAgencies.map((agency) => (
                            <tr key={agency.id} className="hover:bg-logo-beige transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {agency.logo ? (
                                  <img 
                                    src={agency.logo} 
                                    alt={agency.name} 
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                    <Building className="h-5 w-5 text-white" />
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">{agency.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{agency.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{agency.phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {agency.healthStatus === 'good' ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    🟢 Good
                                  </span>
                                ) : agency.healthStatus === 'average' ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    🟡 Average
                                  </span>
                                ) : (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    🔴 Poor
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {agency.totalAgents}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {agency.totalProperties}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {agency.totalLeads}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {agency.daysSinceActivity !== null ? (
                                  <span className="text-sm text-gray-900">
                                    {agency.daysSinceActivity === 0 ? 'Today' : `${agency.daysSinceActivity} days ago`}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">Never</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {agency.isActive ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    Inactive
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                              No agencies found matching your filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )
        })()}

        {/* Lead Funnel Report */}
        {selectedReport === 'lead_funnel' && (
          <>
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Lead Funnel Chart</h3>
              </div>
              <div className="card-body">
                <LeadFunnelChart data={reportData.leadsByStatus} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Funnel Statistics</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">New Leads</span>
                      <span className="text-2xl font-semibold text-blue-600">{reportData.leadsByStatus.new || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Contacted</span>
                      <span className="text-2xl font-semibold text-purple-600">{reportData.leadsByStatus.contacted || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Qualified</span>
                      <span className="text-2xl font-semibold text-green-600">{reportData.leadsByStatus.qualified || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Site Visit</span>
                      <span className="text-2xl font-semibold text-yellow-600">{reportData.leadsByStatus.site_visit_scheduled || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Booked</span>
                      <span className="text-2xl font-semibold text-green-600">{reportData.leadsByStatus.booked || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Lost</span>
                      <span className="text-2xl font-semibold text-red-600">{reportData.leadsByStatus.lost || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Conversion Metrics</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Total Leads</span>
                      <span className="text-2xl font-semibold text-gray-900">{reportData.totalLeads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Conversion Rate</span>
                      <span className="text-2xl font-semibold text-green-600">
                        {reportData.totalLeads > 0 
                          ? ((reportData.leadsByStatus.booked || 0) / reportData.totalLeads * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Qualification Rate</span>
                      <span className="text-2xl font-semibold text-blue-600">
                        {reportData.totalLeads > 0 
                          ? ((reportData.leadsByStatus.qualified || 0) / reportData.totalLeads * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Site Visit Rate</span>
                      <span className="text-2xl font-semibold text-yellow-600">
                        {reportData.totalLeads > 0 
                          ? ((reportData.leadsByStatus.site_visit_scheduled || 0) / reportData.totalLeads * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Campaign ROI Report */}
        {selectedReport === 'campaign_roi' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
                </div>
                <div className="card-body">
                  {reportData.campaignROI && reportData.campaignROI.length > 0 ? (
                    <div className="space-y-4">
                      {reportData.campaignROI.map((campaign, index) => {
                        const roi = campaign.cost > 0 ? ((campaign.revenue - campaign.cost) / campaign.cost * 100).toFixed(1) : 0
                        return (
                          <div key={index} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900">{campaign.name}</span>
                              <span className={`text-sm font-bold ${roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {roi > 0 ? '+' : ''}{roi}% ROI
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Total Leads:</span>
                                <span className="font-medium">{campaign.totalLeads}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Converted:</span>
                                <span className="font-medium text-green-600">{campaign.convertedLeads}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Revenue:</span>
                                <span className="font-medium">${campaign.revenue.toLocaleString()}</span>
                              </div>
                              {campaign.cost > 0 && (
                                <div className="flex justify-between">
                                  <span>Cost:</span>
                                  <span className="font-medium">${campaign.cost.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No campaign data available</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Summary</h3>
                </div>
                <div className="card-body">
                  {reportData.campaignROI && reportData.campaignROI.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Total Campaigns</span>
                        <span className="text-2xl font-semibold text-gray-900">{reportData.campaignROI.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Total Leads</span>
                        <span className="text-2xl font-semibold text-blue-600">
                          {reportData.campaignROI.reduce((sum, c) => sum + c.totalLeads, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Total Converted</span>
                        <span className="text-2xl font-semibold text-green-600">
                          {reportData.campaignROI.reduce((sum, c) => sum + c.convertedLeads, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Total Revenue</span>
                        <span className="text-2xl font-semibold text-purple-600">
                          ${reportData.campaignROI.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Top Performing Campaigns</h3>
                </div>
                <div className="card-body">
                  {reportData.campaignROI && reportData.campaignROI.length > 0 ? (
                    <div className="space-y-3">
                      {[...reportData.campaignROI]
                        .sort((a, b) => {
                          const roiA = a.cost > 0 ? ((a.revenue - a.cost) / a.cost) : 0
                          const roiB = b.cost > 0 ? ((b.revenue - b.cost) / b.cost) : 0
                          return roiB - roiA
                        })
                        .slice(0, 5)
                        .map((campaign, index) => {
                          const roi = campaign.cost > 0 ? ((campaign.revenue - campaign.cost) / campaign.cost * 100).toFixed(1) : 0
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                                <p className="text-xs text-gray-500">{campaign.convertedLeads} conversions</p>
                              </div>
                              <span className={`text-sm font-bold ${roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {roi > 0 ? '+' : ''}{roi}%
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Follow-up Compliance Report */}
        {selectedReport === 'followup' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Total with Follow-up</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-gray-900">
                    {reportData.followUpCompliance?.totalLeadsWithFollowUp || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Leads scheduled for follow-up</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Completed</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.followUpCompliance?.totalFollowUpsCompleted || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Follow-ups completed on time</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Overdue</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-red-600">
                    {reportData.followUpCompliance?.overdueFollowUps || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Follow-ups past due date</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Compliance Rate</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-blue-600">
                    {reportData.followUpCompliance?.complianceRate || 0}%
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Overall compliance percentage</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Upcoming Follow-ups</h3>
                </div>
                <div className="card-body">
                  <div className="text-2xl font-bold text-yellow-600">
                    {reportData.followUpCompliance?.upcomingFollowUps || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Follow-ups scheduled for today/tomorrow</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Compliance Breakdown</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">Completed</span>
                        <span className="text-sm text-gray-500">
                          {reportData.followUpCompliance?.totalLeadsWithFollowUp > 0
                            ? ((reportData.followUpCompliance?.totalFollowUpsCompleted / reportData.followUpCompliance?.totalLeadsWithFollowUp) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${reportData.followUpCompliance?.totalLeadsWithFollowUp > 0
                              ? ((reportData.followUpCompliance?.totalFollowUpsCompleted / reportData.followUpCompliance?.totalLeadsWithFollowUp) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">Overdue</span>
                        <span className="text-sm text-gray-500">
                          {reportData.followUpCompliance?.totalLeadsWithFollowUp > 0
                            ? ((reportData.followUpCompliance?.overdueFollowUps / reportData.followUpCompliance?.totalLeadsWithFollowUp) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{
                            width: `${reportData.followUpCompliance?.totalLeadsWithFollowUp > 0
                              ? ((reportData.followUpCompliance?.overdueFollowUps / reportData.followUpCompliance?.totalLeadsWithFollowUp) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Site Visit Conversion Report */}
        {selectedReport === 'site_visit' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Total Scheduled</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-gray-900">
                    {reportData.siteVisitConversion?.totalScheduled || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Site visits scheduled</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Completed</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.siteVisitConversion?.totalCompleted || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Visits completed</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Show-up Rate</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-blue-600">
                    {reportData.siteVisitConversion?.showUpRate || 0}%
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Percentage who showed up</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Conversion Rate</h3>
                </div>
                <div className="card-body">
                  <div className="text-3xl font-bold text-purple-600">
                    {reportData.siteVisitConversion?.conversionRate || 0}%
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Converted after visit</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">No Shows</h3>
                </div>
                <div className="card-body">
                  <div className="text-2xl font-bold text-red-600">
                    {reportData.siteVisitConversion?.totalNoShow || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Visits where lead didn't show</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Cancelled</h3>
                </div>
                <div className="card-body">
                  <div className="text-2xl font-bold text-yellow-600">
                    {reportData.siteVisitConversion?.totalCancelled || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Visits that were cancelled</p>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Converted from Visit</h3>
                </div>
                <div className="card-body">
                  <div className="text-2xl font-bold text-green-600">
                    {reportData.siteVisitConversion?.convertedFromVisit || 0}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Leads that converted after visit</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Conversion Funnel</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">Scheduled → Completed</span>
                      <span className="text-sm text-gray-500">
                        {reportData.siteVisitConversion?.totalScheduled > 0
                          ? ((reportData.siteVisitConversion?.totalCompleted / reportData.siteVisitConversion?.totalScheduled) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{
                          width: `${reportData.siteVisitConversion?.totalScheduled > 0
                            ? ((reportData.siteVisitConversion?.totalCompleted / reportData.siteVisitConversion?.totalScheduled) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">Completed → Converted</span>
                      <span className="text-sm text-gray-500">
                        {reportData.siteVisitConversion?.totalCompleted > 0
                          ? ((reportData.siteVisitConversion?.convertedFromVisit / reportData.siteVisitConversion?.totalCompleted) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-600 h-3 rounded-full"
                        style={{
                          width: `${reportData.siteVisitConversion?.totalCompleted > 0
                            ? ((reportData.siteVisitConversion?.convertedFromVisit / reportData.siteVisitConversion?.totalCompleted) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Lost Reasons Report */}
        {selectedReport === 'lost_reasons' && (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Lost Reasons Breakdown</h3>
                </div>
                <div className="card-body">
                  {reportData.lostReasons && Object.keys(reportData.lostReasons).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(reportData.lostReasons)
                        .sort(([, a], [, b]) => b - a)
                        .map(([reason, count]) => {
                          const totalLost = Object.values(reportData.lostReasons).reduce((sum, c) => sum + c, 0)
                          const percentage = ((count / totalLost) * 100).toFixed(1)
                          return (
                            <div key={reason}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 capitalize">{reason.replace('_', ' ')}</span>
                                <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-red-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No lost leads data available</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Summary Statistics</h3>
                </div>
                <div className="card-body">
                  {reportData.lostReasons && Object.keys(reportData.lostReasons).length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Total Lost Leads</span>
                        <span className="text-2xl font-semibold text-red-600">
                          {Object.values(reportData.lostReasons).reduce((sum, count) => sum + count, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Unique Reasons</span>
                        <span className="text-2xl font-semibold text-gray-900">
                          {Object.keys(reportData.lostReasons).length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Most Common Reason</span>
                        <span className="text-lg font-semibold text-gray-900 capitalize">
                          {Object.entries(reportData.lostReasons)
                            .sort(([, a], [, b]) => b - a)[0]?.[0]?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Top 3 Reasons</h4>
                        <div className="space-y-2">
                          {Object.entries(reportData.lostReasons)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([reason, count], index) => (
                              <div key={reason} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                                  <span className="text-sm text-gray-700 capitalize">{reason.replace('_', ' ')}</span>
                                </div>
                                <span className="text-sm font-semibold text-red-600">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                  )}
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
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              activity.type === 'property_added' ? 'bg-green-100' : 'bg-purple-100'
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









