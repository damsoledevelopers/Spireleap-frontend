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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import Link from 'next/link'
import toast from 'react-hot-toast'

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function SuperAdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const [dashboardData, setDashboardData] = useState({
    totalAgencies: 0,
    totalProperties: 0,
    totalLeads: 0,
    totalUsers: 0,
    activeProperties: 0,
    soldProperties: 0,
    rentedProperties: 0,
    pendingProperties: 0,
    inactiveProperties: 0,
    activeLeads: 0,
    newAgencies: 0,
    newProperties: 0,
    newLeads: 0,
    newUsers: 0,
    inquiryStats: {
      website: 0,
      phone: 0,
      email: 0,
      walk_in: 0,
      referral: 0,
      other: 0
    },
    inquiriesByAgency: [],
    transactions: {
      totalTransactions: 0,
      completedTransactions: 0,
      totalRevenue: 0,
      totalCommission: 0
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
        soldProperties: stats.soldProperties || 0,
        rentedProperties: stats.rentedProperties || 0,
        pendingProperties: stats.pendingProperties || 0,
        inactiveProperties: stats.inactiveProperties || 0,
        activeLeads: stats.activeLeads || 0,
        newAgencies: stats.newAgencies || 0,
        newProperties: stats.newProperties || 0,
        newLeads: stats.newLeads || 0,
        newUsers: stats.newUsers || 0,
        inquiryStats: stats.inquiryStats || {
          website: 0,
          phone: 0,
          email: 0,
          walk_in: 0,
          referral: 0,
          other: 0
        },
        inquiriesByAgency: stats.inquiriesByAgency || [],
        transactions: stats.transactions || {
          totalTransactions: 0,
          completedTransactions: 0,
          totalRevenue: 0,
          totalCommission: 0
        }
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const getDynamicStats = () => {
    const baseStats = [
      { name: 'Total Properties', value: dashboardData.totalProperties, change: dashboardData.newProperties, icon: Package, href: '/admin/properties' },
      { name: 'Total Leads', value: dashboardData.totalLeads, change: dashboardData.newLeads, icon: Users, href: '/admin/leads' },
      { name: 'Total Users', value: dashboardData.totalUsers, change: dashboardData.newUsers, icon: UserCheck, href: '/admin/users' },
    ]

    if (user?.role === 'super_admin' || user?.role === 'staff') {
      return [
        { name: 'Total Agencies', value: dashboardData.totalAgencies, change: dashboardData.newAgencies, icon: Building, href: '/admin/agencies' },
        ...baseStats.slice(0, 2),
        baseStats[2]
      ]
    }

    if (user?.role === 'agency_admin') {
      return [
        { name: 'Total Agents', value: dashboardData.totalUsers, change: dashboardData.newUsers, icon: UserCheck, href: '/admin/users?role=agent' },
        ...baseStats.slice(0, 2),
        { name: 'Agency Revenue', value: `₹${(dashboardData.transactions?.totalRevenue || 0).toLocaleString()}`, change: 0, icon: DollarSign, href: '/admin/transactions' }
      ]
    }

    if (user?.role === 'agent') {
      return [
        { name: 'Completed Deals', value: dashboardData.transactions?.completedTransactions || 0, change: 0, icon: TrendingUp, href: '/admin/transactions' },
        { name: 'Total Commission', value: `₹${(dashboardData.transactions?.totalCommission || 0).toLocaleString()}`, change: 0, icon: DollarSign, href: '/admin/transactions' },
        ...baseStats.slice(0, 2)
      ]
    }

    return baseStats
  }

  const dynamicStats = getDynamicStats()

  // Prepare data for charts with all categories shown
  // Ensure standard sources are always represented in the chart data
  const standardSources = ['website', 'phone', 'email', 'walk_in', 'referral', 'other'];
  const inquirySourceData = standardSources.map(source => ({
    name: source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' '),
    value: dashboardData.inquiryStats[source] || 0
  })).filter(item => item.value > 0 || ['Walk in', 'Referral'].includes(item.name));

  const propertyStatusData = [
    { name: 'Active', value: dashboardData.activeProperties },
    { name: 'Sold', value: dashboardData.soldProperties },
    { name: 'Rented', value: dashboardData.rentedProperties },
    { name: 'Pending', value: dashboardData.pendingProperties },
    { name: 'Inactive', value: dashboardData.inactiveProperties },
  ];

  const agencyInquiryData = dashboardData.inquiriesByAgency.map(item => ({
    name: item.name,
    inquiries: item.count
  }));

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
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
          <div className="mt-4 md:mt-0">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Grid - Matching User Design */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dynamicStats.map((stat) => {
            const StatIcon = stat.icon
            return (
              <Link
                key={stat.name}
                href={stat.href}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all group"
              >
                <div className="flex items-center space-x-5">
                  <div className="flex-shrink-0 p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                    <StatIcon className="h-7 w-7 text-gray-400 group-hover:text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 truncate mb-1">
                      {stat.name}
                    </p>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-gray-900 leading-none">
                        {stat.value}
                      </span>
                      {typeof stat.change === 'number' && stat.change > 0 && (
                        <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          +{stat.change}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inquiry Sources Pie Chart - More attractive donut design */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inquiries by Source</h2>
            <div className="h-64">
              {inquirySourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inquirySourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      cornerRadius={6}
                      dataKey="value"
                    >
                      {inquirySourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
              )}
            </div>
          </div>

          {/* Property Status Donut Chart - Showing all statuses */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Inventory Status</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={propertyStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => value > 0 ? `${name} (${value})` : ''}
                    dataKey="value"
                  >
                    {propertyStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inquiries by Agency Bar Chart (Only for Super Admin/Staff) */}
          {(user?.role === 'super_admin' || user?.role === 'staff') && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Agencies by Lead Volume</h2>
              <div className="h-80">
                {agencyInquiryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={agencyInquiryData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} height={60} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="inquiries" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(user?.role === 'super_admin') && (
              <Link
                href="/admin/agencies"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <Building className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Add Agency</p>
              </Link>
            )}
            {(user?.role === 'super_admin' || user?.role === 'agency_admin' || user?.role === 'agent') && (
              <Link
                href="/admin/properties"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <Package className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Add Property</p>
              </Link>
            )}
            {(user?.role === 'super_admin' || user?.role === 'agency_admin' || user?.role === 'agent') && (
              <Link
                href="/admin/leads"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                <Users className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Manage Leads</p>
              </Link>
            )}
            <Link
              href="/admin/reports"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <FileText className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">View Reports</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
