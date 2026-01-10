'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Users,
  Package,
  TrendingUp,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const stats = [
  { name: 'My Properties', value: '0', icon: Package, change: '+2', changeType: 'positive', href: '/agent/properties' },
  { name: 'Active Properties', value: '0', icon: Package, change: '+1', changeType: 'positive', href: '/agent/properties?status=active' },
  { name: 'My Leads', value: '0', icon: Users, change: '+5', changeType: 'positive', href: '/agent/leads' },
  { name: 'New Leads', value: '0', icon: FileText, change: '+3', changeType: 'positive', href: '/agent/leads?status=new' },
]

export default function AgentDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [dashboardData, setDashboardData] = useState({
    totalProperties: 0,
    activeProperties: 0,
    totalLeads: 0,
    newLeads: 0,
    inquiryStats: {
      website: 0,
      phone: 0,
      email: 0,
      walk_in: 0,
      referral: 0,
      other: 0
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && !authLoading) {
      fetchDashboardData()
    }
  }, [user, authLoading])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      if (!user) {
        console.error('User not available')
        return
      }

      // Get user ID - handle both _id and id formats
      const userId = user._id || user.id
      if (!userId) {
        console.error('User ID not found')
        return
      }

      console.log('Fetching dashboard data for agent:', userId)
      
      // Fetch agent's properties - backend should filter by agent role
      const propertiesRes = await api.get('/properties?limit=100').catch(err => {
        console.error('Error fetching properties:', err)
        return { data: { properties: [] } }
      })
      const allProperties = propertiesRes.data?.properties || []
      
      // Filter properties by agent - handle both populated and non-populated agent field
      const myProperties = allProperties.filter(p => {
        const agentId = typeof p.agent === 'object' 
          ? (p.agent?._id || p.agent?.id || p.agent)
          : p.agent
        return agentId?.toString() === userId.toString()
      })
      
      console.log('Agent properties:', {
        total: allProperties.length,
        myProperties: myProperties.length,
        userId: userId.toString()
      })
      
      // Fetch agent's leads - backend should filter by assignedAgent for agent role
      const leadsRes = await api.get('/leads?limit=100').catch(err => {
        console.error('Error fetching leads:', err)
        return { data: { leads: [] } }
      })
      const allLeads = leadsRes.data?.leads || []
      
      // Filter leads by assigned agent - handle both populated and non-populated assignedAgent field
      const myLeads = allLeads.filter(l => {
        const assignedAgentId = typeof l.assignedAgent === 'object'
          ? (l.assignedAgent?._id || l.assignedAgent?.id || l.assignedAgent)
          : l.assignedAgent
        return assignedAgentId?.toString() === userId.toString()
      })

      console.log('Agent leads:', {
        total: allLeads.length,
        myLeads: myLeads.length,
        userId: userId.toString()
      })

      // Calculate inquiry statistics
      const inquiryStats = {
        website: myLeads.filter(l => l.source === 'website').length,
        phone: myLeads.filter(l => l.source === 'phone').length,
        email: myLeads.filter(l => l.source === 'email').length,
        walk_in: myLeads.filter(l => l.source === 'walk_in').length,
        referral: myLeads.filter(l => l.source === 'referral').length,
        other: myLeads.filter(l => !l.source || l.source === 'other' || !['website', 'phone', 'email', 'walk_in', 'referral'].includes(l.source)).length
      }

      setDashboardData({
        totalProperties: myProperties.length,
        activeProperties: myProperties.filter(p => p.status === 'active').length,
        totalLeads: myLeads.length,
        newLeads: myLeads.filter(l => l.status === 'new').length,
        inquiryStats
      })
      
      console.log('Dashboard data set:', {
        totalProperties: myProperties.length,
        activeProperties: myProperties.filter(p => p.status === 'active').length,
        totalLeads: myLeads.length,
        newLeads: myLeads.filter(l => l.status === 'new').length
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      console.error('Error details:', error.response?.data)
      toast.error('Failed to load dashboard data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.firstName}! Here's your overview.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const StatIcon = stat.icon
            const value = index === 0 ? dashboardData.totalProperties :
                          index === 1 ? dashboardData.activeProperties :
                          index === 2 ? dashboardData.totalLeads :
                          dashboardData.newLeads
            return (
              <Link key={stat.name} href={stat.href} className="card hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <StatIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {stat.name}
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {value}
                          </div>
                          <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                            stat.changeType === 'positive' ? 'text-green-600' : 
                            stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {stat.change}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Inquiry Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Inquiries by Source</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{dashboardData.inquiryStats?.website || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Website</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{dashboardData.inquiryStats?.phone || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Phone</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{dashboardData.inquiryStats?.email || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Email</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{dashboardData.inquiryStats?.walk_in || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Walk-in</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{dashboardData.inquiryStats?.referral || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Referral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{dashboardData.inquiryStats?.other || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Other</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/agent/properties/add"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
            >
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Add New Property</p>
            </Link>
            <Link
              href="/agent/leads"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
            >
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">View All Leads</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

