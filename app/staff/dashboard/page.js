'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
  Users,
  Package,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function StaffDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    activeProperties: 0,
    recentLeads: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [leadsRes, propertiesRes] = await Promise.all([
        api.get('/leads?limit=5'),
        api.get('/properties?status=active&limit=5')
      ])

      const leads = leadsRes.data.leads || []
      const properties = propertiesRes.data.properties || []

      setStats({
        totalLeads: leadsRes.data.pagination?.total || 0,
        newLeads: leads.filter(l => l.status === 'new').length,
        activeProperties: propertiesRes.data.pagination?.total || 0,
        recentLeads: leads
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'bg-blue-500',
      href: '/staff/leads'
    },
    {
      name: 'New Leads',
      value: stats.newLeads,
      icon: Clock,
      color: 'bg-yellow-500',
      href: '/staff/leads?status=new'
    },
    {
      name: 'Active Properties',
      value: stats.activeProperties,
      icon: Package,
      color: 'bg-green-500',
      href: '/staff/properties'
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Link
                key={stat.name}
                href={stat.href}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <Link href="/staff/leads" className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentLeads.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No leads found
              </div>
            ) : (
              stats.recentLeads.map((lead) => (
                <Link
                  key={lead._id}
                  href={`/staff/leads/${lead._id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {lead.contact.firstName} {lead.contact.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{lead.contact.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                        lead.status === 'closed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/staff/leads"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Users className="h-6 w-6 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900">Manage Leads</p>
                <p className="text-sm text-gray-500">View and manage all leads</p>
              </div>
            </Link>
            <Link
              href="/staff/properties"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Package className="h-6 w-6 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900">View Properties</p>
                <p className="text-sm text-gray-500">Browse active properties</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

