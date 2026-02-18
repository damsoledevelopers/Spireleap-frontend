'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
    DollarSign,
    Calendar,
    User,
    Building,
    Package,
    Filter,
    Search,
    TrendingUp,
    Download,
    Eye,
    ArrowUpRight,
    BadgeDollarSign,
    X,
    XCircle,
    ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminTransactionsPage() {
    const { user, loading: authLoading, checkPermission } = useAuth()
    const router = useRouter()

    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        search: ''
    })
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showPricePicker, setShowPricePicker] = useState(false)
    const [summary, setSummary] = useState(null)

    useEffect(() => {
        if (!authLoading && user) {
            if (!checkPermission('leads', 'view')) {
                toast.error('You do not have permission to view Transactions')
                router.push('/admin/dashboard')
                return
            }

            // Set up debounced fetch for search and budget filters
            const shouldDebounce = filters.search || filters.minAmount || filters.maxAmount
            const timer = setTimeout(() => {
                fetchTransactions()
                fetchAnalytics()
            }, shouldDebounce ? 500 : 0)

            return () => clearTimeout(timer)
        }
    }, [user, authLoading, filters.status, filters.type, filters.startDate, filters.endDate, filters.minAmount, filters.maxAmount, filters.search])

    const fetchTransactions = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (filters.status) params.append('status', filters.status)
            if (filters.type) params.append('type', filters.type)
            if (filters.startDate) params.append('startDate', filters.startDate)
            if (filters.endDate) params.append('endDate', filters.endDate)
            if (filters.minAmount) params.append('minAmount', filters.minAmount)
            if (filters.maxAmount) params.append('maxAmount', filters.maxAmount)
            if (filters.search) params.append('search', filters.search)

            const response = await api.get(`/transactions?${params.toString()}`)
            setTransactions(response.data)
        } catch (error) {
            console.error('Error fetching transactions:', error)
            toast.error('Failed to load transactions')
        } finally {
            setLoading(false)
        }
    }

    const fetchAnalytics = async () => {
        try {
            const params = new URLSearchParams()
            if (filters.startDate) params.append('startDate', filters.startDate)
            if (filters.endDate) params.append('endDate', filters.endDate)
            if (filters.minAmount) params.append('minAmount', filters.minAmount)
            if (filters.maxAmount) params.append('maxAmount', filters.maxAmount)

            const response = await api.get(`/transactions/analytics/revenue?${params.toString()}`)
            setSummary(response.data.summary)
        } catch (error) {
            console.error('Error fetching analytics:', error)
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800'
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const setRange = (range) => {
        const today = new Date()
        let start = new Date()
        let end = new Date()

        switch (range) {
            case 'today':
                break
            case 'yesterday':
                start.setDate(today.getDate() - 1)
                end.setDate(today.getDate() - 1)
                break
            case 'last7':
                start.setDate(today.getDate() - 6)
                break
            case 'last30':
                start.setDate(today.getDate() - 29)
                break
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1)
                break
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                end = new Date(today.getFullYear(), today.getMonth(), 0)
                break
            default:
                return
        }

        const startStr = start.toISOString().split('T')[0]
        const endStr = end.toISOString().split('T')[0]
        setFilters(prev => ({ ...prev, startDate: startStr, endDate: endStr }))
        setShowDatePicker(false)
    }

    const filteredTransactions = transactions // Managed by backend now

    // Only show full page loader on initial load
    if (authLoading || (loading && transactions.length === 0 && !filters.search && !filters.minAmount && !filters.maxAmount && !filters.status && !filters.type)) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                        <p className="text-gray-500">View and manage all completed deals and sales</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Export button placeholder */}
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Analytics Summary */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <BadgeDollarSign className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Commission</p>
                                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalCommission)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 rounded-lg">
                                    <ArrowUpRight className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Avg. Deal Value</p>
                                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.averageTransactionValue)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 rounded-lg">
                                    <Package className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Completed Deals</p>
                                    <p className="text-xl font-bold text-gray-900">{summary.totalTransactions}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                className="pl-10 w-full px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>

                        {/* Status */}
                        <select
                            className="w-full md:w-40 px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        {/* Type */}
                        <select
                            className="w-full md:w-40 px-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="">All Types</option>
                            <option value="sale">Sale</option>
                            <option value="rent">Rent</option>
                            <option value="commission">Commission</option>
                        </select>

                        {/* Date Picker */}
                        <div className="relative w-full md:w-auto">
                            <button
                                onClick={() => {
                                    setShowDatePicker(!showDatePicker)
                                    setShowPricePicker(false)
                                }}
                                className={`w-full flex items-center justify-between px-4 h-[42px] border rounded-lg text-sm font-medium transition-colors whitespace-nowrap gap-3 ${filters.startDate || filters.endDate ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        {filters.startDate && filters.endDate
                                            ? `${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                            : filters.startDate
                                                ? `From ${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                                : filters.endDate
                                                    ? `Until ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                                    : 'Date'}
                                    </span>
                                </div>
                                {filters.startDate || filters.endDate ? (
                                    <X
                                        className="h-4 w-4 text-gray-400 hover:text-gray-600"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
                                        }}
                                    />
                                ) : <ChevronDown className={`h-4 w-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />}
                            </button>
                            {showDatePicker && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                                    <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-0 z-50 min-w-[600px] overflow-hidden">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="w-full md:w-40 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 p-2">
                                                <div className="flex flex-col gap-1">
                                                    {[
                                                        { label: 'Today', value: 'today' },
                                                        { label: 'Yesterday', value: 'yesterday' },
                                                        { label: 'Last 7 Days', value: 'last7' },
                                                        { label: 'Last 30 Days', value: 'last30' },
                                                        { label: 'This Month', value: 'thisMonth' },
                                                        { label: 'Last Month', value: 'lastMonth' }
                                                    ].map((preset) => (
                                                        <button
                                                            key={preset.value}
                                                            onClick={() => setRange(preset.value)}
                                                            className="text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex-1 p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-medium text-gray-700 mb-2">From Date</label>
                                                        <input
                                                            type="date"
                                                            value={filters.startDate}
                                                            onChange={(e) => {
                                                                const newStartDate = e.target.value
                                                                setFilters(prev => ({ ...prev, startDate: newStartDate }))
                                                                if (filters.endDate && newStartDate && filters.endDate < newStartDate) {
                                                                    setFilters(prev => ({ ...prev, endDate: '' }))
                                                                }
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-medium text-gray-700 mb-2">To Date</label>
                                                        <input
                                                            type="date"
                                                            value={filters.endDate}
                                                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                                            min={filters.startDate || undefined}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-6">
                                                    <button
                                                        onClick={() => {
                                                            setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
                                                            setShowDatePicker(false)
                                                        }}
                                                        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                                                    >
                                                        Clear Dates
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDatePicker(false)}
                                                        className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 font-medium"
                                                    >
                                                        Apply Dates
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Price Range Picker */}
                        <div className="relative w-full md:w-auto">
                            <button
                                onClick={() => {
                                    setShowPricePicker(!showPricePicker)
                                    setShowDatePicker(false)
                                }}
                                className={`w-full flex items-center justify-between px-4 h-[42px] border rounded-lg text-sm font-medium transition-colors whitespace-nowrap gap-3 ${filters.minAmount || filters.maxAmount ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    <span>
                                        {filters.minAmount && filters.maxAmount
                                            ? `${formatCurrency(filters.minAmount)} - ${formatCurrency(filters.maxAmount)}`
                                            : filters.minAmount
                                                ? `${formatCurrency(filters.minAmount)}+`
                                                : filters.maxAmount
                                                    ? `Up to ${formatCurrency(filters.maxAmount)}`
                                                    : 'Budget Range'}
                                    </span>
                                </div>
                                {filters.minAmount || filters.maxAmount ? (
                                    <X
                                        className="h-4 w-4 text-gray-400 hover:text-gray-600"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setFilters(prev => ({ ...prev, minAmount: '', maxAmount: '' }))
                                        }}
                                    />
                                ) : <ChevronDown className={`h-4 w-4 transition-transform ${showPricePicker ? 'rotate-180' : ''}`} />}
                            </button>
                            {showPricePicker && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowPricePicker(false)} />
                                    <div className="absolute top-full left-0 md:left-auto md:right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[300px]">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Budget Range</h3>
                                        <div className="space-y-4">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">Min Amount</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Min"
                                                        value={filters.minAmount}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-gray-700 mb-2">Max Amount</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Max"
                                                        value={filters.maxAmount}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setFilters(prev => ({ ...prev, minAmount: '', maxAmount: '' }))
                                                        setShowPricePicker(false)
                                                    }}
                                                    className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                                                >
                                                    Clear Range
                                                </button>
                                                <button
                                                    onClick={() => setShowPricePicker(false)}
                                                    className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 font-medium"
                                                >
                                                    Apply Range
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Global Clear Filters */}
                        {(filters.status || filters.type || filters.startDate || filters.endDate || filters.minAmount || filters.maxAmount || filters.search) && (
                            <button
                                onClick={() => {
                                    setFilters({
                                        status: '',
                                        type: '',
                                        startDate: '',
                                        endDate: '',
                                        minAmount: '',
                                        maxAmount: '',
                                        search: ''
                                    })
                                }}
                                className="flex items-center gap-2 px-4 h-[42px] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
                                title="Clear all filters"
                            >
                                <XCircle className="h-4 w-4" />
                                Clear All
                            </button>
                        )}
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Property</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Client</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Agent</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Amount</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((t) => (
                                        <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{t.property?.title}</div>
                                                <div className="text-xs text-gray-500">#{t._id.slice(-6).toUpperCase()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span>{t.lead?.contact?.firstName} {t.lead?.contact?.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-gray-400" />
                                                    <span>{t.agent?.firstName} {t.agent?.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 capitalize">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'sale' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {formatCurrency(t.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {new Date(t.transactionDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(t.status)}`}>
                                                    {t.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                                    <Eye className="h-5 w-5 text-gray-500" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <DollarSign className="h-12 w-12 text-gray-200 mb-2" />
                                                <p>No transactions found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout >
    )
}
