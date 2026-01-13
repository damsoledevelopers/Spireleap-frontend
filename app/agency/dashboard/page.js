'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Users,
  Package,
  TrendingUp,
  DollarSign,
  FileText,
  UserCheck
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const stats = [
  { name: 'Total Properties', value: '0', icon: Package, change: '+5', changeType: 'positive', href: '/admin/properties' },
  { name: 'Active Properties', value: '0', icon: Package, change: '+3', changeType: 'positive', href: '/admin/properties?status=active' },
  { name: 'Total Leads', value: '0', icon: Users, change: '+12', changeType: 'positive', href: '/admin/leads' },
  { name: 'Active Leads', value: '0', icon: UserCheck, change: '+8', changeType: 'positive', href: '/admin/leads?status=new' },
]

export default function AgencyAdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [dashboardData, setDashboardData] = useState({
    totalProperties: 0,
    activeProperties: 0,
    soldProperties: 0,
    rentedProperties: 0,
    totalLeads: 0,
    activeLeads: 0,
    totalAgents: 0,
    inquiryStats: {
      website: 0,
      phone: 0,
      email: 0,
      walk_in: 0,
      referral: 0,
      other: 0
    },
    inquiriesByProperty: []
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

      if (!user.agency) {
        console.error('User agency not found')
        toast.error('Agency not assigned to your account')
        return
      }

      const agencyId = typeof user.agency === 'object' ? user.agency._id : user.agency

      // Use optimized stats endpoint instead of fetching all data
      const [statsRes, agencyStatsRes] = await Promise.all([
        api.get('/stats/dashboard').catch(err => {
          console.error('Error fetching dashboard stats:', err)
          return { data: {} }
        }),
        api.get(`/agencies/${agencyId}/stats`).catch(err => {
          console.error('Error fetching agency stats:', err)
          return { data: { stats: {} } }
        })
      ])

      const stats = statsRes.data || {}
      const agencyStats = agencyStatsRes.data?.stats || {}

      // Use agency-specific stats when available, fallback to dashboard stats
      const finalStats = {
        totalProperties: agencyStats.totalProperties || stats.totalProperties || 0,
        activeProperties: agencyStats.activeProperties || stats.activeProperties || 0,
        soldProperties: agencyStats.soldProperties || 0,
        rentedProperties: agencyStats.rentedProperties || 0,
        totalLeads: agencyStats.totalLeads || stats.totalLeads || 0,
        activeLeads: agencyStats.activeLeads || stats.activeLeads || 0,
        totalAgents: agencyStats.totalAgents || stats.totalUsers || 0,
        inquiryStats: stats.inquiryStats || {
          website: 0,
          phone: 0,
          email: 0,
          walk_in: 0,
          referral: 0,
          other: 0
        },
        inquiriesByProperty: [] // Can be fetched separately if needed
      }

      setDashboardData(finalStats)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
          <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.firstName}! Here's your agency overview.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const StatIcon = stat.icon
            const value = index === 0 ? dashboardData.totalProperties :
              index === 1 ? dashboardData.activeProperties :
                index === 2 ? dashboardData.totalLeads :
                  dashboardData.activeLeads
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
                          <div className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'positive' ? 'text-green-600' :
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

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Properties</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sold</span>
                <span className="font-semibold text-gray-900">{dashboardData.soldProperties}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rented</span>
                <span className="font-semibold text-gray-900">{dashboardData.rentedProperties}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Agents</span>
                <span className="font-semibold text-gray-900">{dashboardData.totalAgents}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Leads</span>
                <span className="font-semibold text-gray-900">{dashboardData.totalLeads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Leads</span>
                <span className="font-semibold text-gray-900">{dashboardData.activeLeads}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inquiries by Source</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Website</span>
                <span className="font-semibold text-gray-900">{dashboardData.inquiryStats?.website || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Phone</span>
                <span className="font-semibold text-gray-900">{dashboardData.inquiryStats?.phone || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email</span>
                <span className="font-semibold text-gray-900">{dashboardData.inquiryStats?.email || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Walk-in</span>
                <span className="font-semibold text-gray-900">{dashboardData.inquiryStats?.walk_in || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Referral</span>
                <span className="font-semibold text-gray-900">{dashboardData.inquiryStats?.referral || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Other</span>
                <span className="font-semibold text-gray-900">{dashboardData.inquiryStats?.other || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Properties (by Inquiries)</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {dashboardData.inquiriesByProperty && dashboardData.inquiriesByProperty.length > 0 ? (
                dashboardData.inquiriesByProperty.map((property, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-gray-600 truncate text-sm">{property.title}</span>
                    <span className="font-semibold text-gray-900 ml-2">{property.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No inquiries yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/properties/add"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center cursor-pointer block"
            >
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Add New Property</p>
            </Link>
            <Link
              href="/admin/leads"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center cursor-pointer block"
            >
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Manage Leads</p>
            </Link>
            <Link
              href="/admin/users?tab=agents"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center cursor-pointer block"
            >
              <UserCheck className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Manage Agents</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

