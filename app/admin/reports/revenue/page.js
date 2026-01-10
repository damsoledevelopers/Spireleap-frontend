'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import RevenueWidgets from '../../../../components/Dashboard/RevenueWidgets'
import RevenueChart from '../../../../components/Reports/Charts/RevenueChart'
import { DollarSign, TrendingUp, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToCSV } from '../../../../lib/exportUtils'

export default function RevenueReports() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    revenueGrowth: 0,
    commissionGrowth: 0,
    avgTransaction: 0,
    totalTransactions: 0,
    chartData: [],
    recentTransactions: []
  })
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  useEffect(() => {
    fetchRevenueData()
  }, [selectedPeriod])

  const fetchRevenueData = async () => {
    setLoading(true)
    try {
      const [transactionsResponse, paymentsResponse] = await Promise.all([
        api.get('/transactions').catch(() => ({ data: { transactions: [] } })),
        api.get('/payments').catch(() => ({ data: { payments: [] } }))
      ])

      const transactions = transactionsResponse.data.transactions || []
      const payments = paymentsResponse.data.payments || []

      // Calculate revenue metrics
      const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      const totalCommission = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const completedTransactions = transactions.filter(t => t.status === 'completed')
      const avgTransaction = completedTransactions.length > 0
        ? totalRevenue / completedTransactions.length
        : 0

      // Generate chart data (last 30 days)
      const chartData = []
      const now = new Date()
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dayTransactions = transactions.filter(t => {
          const tDate = new Date(t.date || t.createdAt)
          return tDate.toDateString() === date.toDateString()
        })
        const dayRevenue = dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
        const dayPayments = payments.filter(p => {
          const pDate = new Date(p.paymentDate || p.createdAt)
          return pDate.toDateString() === date.toDateString()
        })
        const dayCommission = dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        
        chartData.push({
          date: date.toISOString(),
          revenue: dayRevenue,
          commission: dayCommission
        })
      }

      // Recent transactions
      const recentTransactions = transactions
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 10)
        .map(t => ({
          _id: t._id,
          date: t.date || t.createdAt,
          propertyTitle: t.property?.title || 'N/A',
          amount: t.amount || 0,
          commission: t.commission || 0,
          status: t.status || 'pending'
        }))

      setRevenueData({
        totalRevenue,
        totalCommission,
        revenueGrowth: 0, // Calculate from previous period
        commissionGrowth: 0,
        avgTransaction,
        totalTransactions: transactions.length,
        chartData,
        recentTransactions
      })
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      toast.error('Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const exportData = revenueData.recentTransactions.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Property: t.propertyTitle,
      Amount: t.amount,
      Commission: t.commission,
      Status: t.status
    }))
    exportToCSV(exportData, `revenue-report-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Revenue report exported successfully')
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue & Financial Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track revenue, commissions, and financial performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <RevenueWidgets revenueData={revenueData} period={selectedPeriod} />
      </div>
    </DashboardLayout>
  )
}

