'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Users,
  Building,
  Package,
  TrendingUp,
  DollarSign,
  UserCheck,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const stats = [
  { name: 'Total Agencies', value: '0', icon: Building, change: '+2', changeType: 'positive', href: '/admin/agencies' },
  { name: 'Total Properties', value: '0', icon: Package, change: '+15', changeType: 'positive', href: '/admin/properties' },
  { name: 'Total Leads', value: '0', icon: Users, change: '+23', changeType: 'positive', href: '/admin/leads' },
  { name: 'Total Users', value: '0', icon: UserCheck, change: '+8', changeType: 'positive', href: '/admin/users' },
]

export default function SuperAdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [dashboardData, setDashboardData] = useState({
    totalAgencies: 0,
    totalProperties: 0,
    totalLeads: 0,
    totalUsers: 0,
    activeProperties: 0,
    activeLeads: 0,
    inquiryStats: {
      website: 0,
      phone: 0,
      email: 0,
      walk_in: 0,
      referral: 0,
      other: 0
    },
    inquiriesByAgency: []
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

      // Use optimized stats endpoint instead of fetching all data
      const statsRes = await api.get('/stats/dashboard').catch(err => {
        console.error('Error fetching dashboard stats:', err)
        return { data: {} }
      })

      const stats = statsRes.data || {}

      setDashboardData({
        totalAgencies: stats.totalAgencies || 0,
        totalProperties: stats.totalProperties || 0,
        totalLeads: stats.totalLeads || 0,
        totalUsers: stats.totalUsers || 0,
        activeProperties: stats.activeProperties || 0,
        activeLeads: stats.activeLeads || 0,
        inquiryStats: stats.inquiryStats || {
          website: 0,
          phone: 0,
          email: 0,
          walk_in: 0,
          referral: 0,
          other: 0
        },
        inquiriesByAgency: stats.inquiriesByAgency || []
      })
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
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'super_admin' ? 'Super Admin Dashboard' :
              user?.role === 'agency_admin' ? 'Agency Dashboard' :
                'Agent Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.firstName}! Here's your platform overview.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const StatIcon = stat.icon
            // Hide agency and user stats from agents
            if (user?.role === 'agent' && (stat.name === 'Total Agencies' || stat.name === 'Total Users')) {
              return null;
            }

            const value = index === 0 ? dashboardData.totalAgencies :
              index === 1 ? dashboardData.totalProperties :
                index === 2 ? dashboardData.totalLeads :
                  dashboardData.totalUsers
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Properties</span>
                <span className="font-semibold text-gray-900">{dashboardData.activeProperties}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Properties</span>
                <span className="font-semibold text-gray-900">{dashboardData.totalProperties}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Leads</span>
                <span className="font-semibold text-gray-900">{dashboardData.activeLeads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Leads</span>
                <span className="font-semibold text-gray-900">{dashboardData.totalLeads}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(user?.role === 'super_admin') && (
              <Link
                href="/admin/users?tab=agencies"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
              >
                <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Add New Agency</p>
              </Link>
            )}
            {(user?.role === 'super_admin' || user?.role === 'agency_admin' || user?.role === 'agent') && (
              <Link
                href="/admin/properties/add"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
              >
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Add New Property</p>
              </Link>
            )}
            {(user?.role === 'super_admin' || user?.role === 'agency_admin' || user?.role === 'agent') && (
              <Link
                href="/admin/leads"
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
              >
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Manage Leads</p>
              </Link>
            )}
          </div>
        </div>

        {/* Inquiry Statistics - Hide from Agents if needed, but keeping for now */}
        {(user?.role === 'super_admin' || user?.role === 'agency_admin') && (
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Inquiries by Agency</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {dashboardData.inquiriesByAgency && dashboardData.inquiriesByAgency.length > 0 ? (
                  dashboardData.inquiriesByAgency.map((agency, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-gray-600 truncate">{agency.name}</span>
                      <span className="font-semibold text-gray-900 ml-2">{agency.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No inquiries yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
