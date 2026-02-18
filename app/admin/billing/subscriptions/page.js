'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { api } from '../../../../lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../../../contexts/AuthContext'
import { RefreshCw, Eye, Trash2, Power, X, ChevronDown, DollarSign, Calendar, Search, User } from 'lucide-react'

export default function AdminBillingSubscriptionsPage() {
  const { user: currentUser } = useAuth()
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [openFilter, setOpenFilter] = useState(null) // 'price', 'date' or null
  const [filters, setFilters] = useState({
    isActive: 'true',
    plan_id: '',
    search: '',
    price_min: '',
    price_max: '',
    start_date: '',
    end_date: ''
  })
  const [selectedPlans, setSelectedPlans] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  const fetchSubscriptions = async (currentFilters = null) => {
    try {
      setLoading(true)
      const targetFilters = currentFilters || filters
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(targetFilters).filter(([_, v]) => v))
      )
      const res = await api.get(`/subscriptions?${params.toString()}`)
      console.log('Subscriptions API Response:', res.data)
      let subs = res.data.subscriptions || []

      // Normalize date fields and ensure user/plan are handled
      subs = subs.map(s => {
        const startedAt = s.startedAt || s.start_date || s.createdAt
        const endedAt = s.endedAt || s.end_date

        // Handle cases where s.user or s.plan might be string IDs instead of objects
        const userInfo = (s.user && typeof s.user === 'object' && s.user !== null)
          ? s.user
          : { _id: s.user || s.user_id, email: s.userEmail || s.email || '' }

        const userDisplayName = (userInfo.firstName || userInfo.lastName)
          ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()
          : (userInfo.name || userInfo.display_name || userInfo.email || s.userEmail || (userInfo._id ? `User (${userInfo._id.slice(-6)})` : 'Unknown User'))

        // Improve normalization for plan_name and price
        const planInfo = (s.plan && typeof s.plan === 'object' && s.plan !== null)
          ? {
            ...s.plan,
            plan_name: s.plan.plan_name || s.plan.name || s.planName || s.name || (s.provider === 'manual' || s.provider === 'Manual' ? 'Manual Plan' : 'Unknown Plan'),
            price: s.plan.price ?? s.price ?? s.amount ?? 0
          }
          : {
            _id: s.plan || s.plan_id,
            plan_name: s.planName || s.name || (s.provider === 'dummy' ? 'Custom Plan' : (s.provider === 'manual' || s.provider === 'Manual' ? 'Manual Plan' : 'Unknown Plan')),
            price: s.price ?? s.amount ?? 0
          }

        return {
          ...s,
          user: { ...userInfo, displayName: userDisplayName },
          plan: planInfo,
          startedAt,
          endedAt
        }
      })

      // Use all subscriptions instead of deduplicating, so we can see history and avoid "picking the wrong one"
      setSubscriptions(subs)
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
      toast.error('Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }



  useEffect(() => {
    fetchSubscriptions()
  }, [])



  const viewSubscription = async (sub) => {
    try {
      const userId = sub.user?._id || sub.user || sub.user_id
      if (!userId) {
        toast.error('User id not available for this subscription')
        return
      }
      // fetch all subscriptions for this user
      const res = await api.get(`/subscriptions/user/${userId}`)
      // Normalize modal data as well
      const plans = (res.data.subscriptions || res.data || []).map(p => {
        const planInfo = (p.plan && typeof p.plan === 'object' && p.plan !== null)
          ? {
            ...p.plan,
            plan_name: p.plan.plan_name || p.plan.name || p.planName || p.name || 'Unknown Plan',
            price: p.plan.price ?? p.price ?? p.amount ?? 0
          }
          : {
            _id: p.plan || p.plan_id,
            plan_name: p.planName || p.name || (p.provider === 'dummy' ? 'Custom Plan' : 'Unknown Plan'),
            price: p.price ?? p.amount ?? 0
          }

        return {
          ...p,
          startedAt: p.startedAt || p.start_date || p.createdAt,
          endedAt: p.endedAt || p.end_date,
          plan: planInfo
        }
      })

      setSelectedPlans(plans)

      // Use the normalized displayName from the sub if available, or compute it
      const displayName = sub.user?.displayName || (sub.user?.firstName || sub.user?.lastName
        ? `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim()
        : (sub.user?.email || sub.userEmail || `User (${userId.slice(-6)})`))

      setSelectedUser({
        _id: userId,
        displayName,
        firstName: sub.user?.firstName,
        lastName: sub.user?.lastName,
        email: sub.user?.email || sub.userEmail
      })
    } catch (err) {
      console.error('Failed to fetch user subscriptions:', err)
      toast.error('Failed to load subscriptions for user')
    }
  }

  const closeModal = () => {
    setSelectedPlans(null)
    setSelectedUser(null)
  }

  const toggleSubscriptionActive = async (sub) => {
    try {
      const res = await api.patch(`/subscriptions/${sub._id}`, { isActive: !sub.isActive })
      // update local state
      setSubscriptions(prev => prev.map(s => s._id === sub._id ? (res.data.subscription || res.data) : s))
      toast.success('Subscription updated')
    } catch (err) {
      console.error('Toggle subscription error:', err)
      toast.error('Failed to update subscription')
    }
  }

  const deleteSubscription = async (sub) => {
    if (!window.confirm('Delete this subscription?')) return
    try {
      await api.delete(`/subscriptions/${sub._id}`)
      setSubscriptions(prev => prev.filter(s => s._id !== sub._id))
      toast.success('Subscription deleted')
    } catch (err) {
      console.error('Delete subscription error:', err)
      toast.error('Failed to delete subscription')
    }
  }

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
            <p className="mt-1 text-sm text-gray-500">View and manage user billing cycles</p>
          </div>
          <button onClick={() => fetchSubscriptions()} className="btn btn-secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[300px] max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by user or plan name..."
              className="form-input pl-10 pr-10 w-full"
              value={filters.search}
              onChange={(e) => {
                const val = e.target.value;
                setFilters(prev => ({ ...prev, search: val }));
                // We could debounce this, but for now simple refresh
                // fetchSubscriptions({ ...filters, search: val });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchSubscriptions();
              }}
            />
            {filters.search && (
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, search: '' }));
                  fetchSubscriptions({ ...filters, search: '' });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Price Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${openFilter === 'price' || filters.price_min || filters.price_max
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Price Range</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openFilter === 'price' ? 'rotate-180' : ''}`} />
              </button>

              {openFilter === 'price' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Price</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Min Price</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="form-input text-sm"
                          value={filters.price_min}
                          onChange={(e) => setFilters(prev => ({ ...prev, price_min: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Max Price</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Any"
                          className="form-input text-sm"
                          value={filters.price_max}
                          onChange={(e) => setFilters(prev => ({ ...prev, price_max: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
                        onClick={() => {
                          setFilters(prev => ({ ...prev, price_min: '', price_max: '' }))
                          fetchSubscriptions({ ...filters, price_min: '', price_max: '' })
                          setOpenFilter(null)
                        }}
                      >
                        Clear
                      </button>
                      <button
                        className="flex-1 bg-primary-600 text-white rounded-lg text-sm font-medium py-2 hover:bg-primary-700 transition-colors"
                        onClick={() => {
                          fetchSubscriptions()
                          setOpenFilter(null)
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenFilter(openFilter === 'date' ? null : 'date')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${openFilter === 'date' || filters.start_date || filters.end_date
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Date Range</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openFilter === 'date' ? 'rotate-180' : ''}`} />
              </button>

              {openFilter === 'date' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Date</h3>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">From Date</label>
                        <input
                          type="date"
                          className="form-input text-sm"
                          value={filters.start_date}
                          onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">To Date</label>
                        <input
                          type="date"
                          className="form-input text-sm"
                          value={filters.end_date}
                          onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
                        onClick={() => {
                          setFilters(prev => ({ ...prev, start_date: '', end_date: '' }))
                          fetchSubscriptions({ ...filters, start_date: '', end_date: '' })
                          setOpenFilter(null)
                        }}
                      >
                        Clear
                      </button>
                      <button
                        className="flex-1 bg-primary-600 text-white rounded-lg text-sm font-medium py-2 hover:bg-primary-700 transition-colors"
                        onClick={() => {
                          fetchSubscriptions()
                          setOpenFilter(null)
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {(filters.search || filters.isActive || filters.price_min || filters.price_max || filters.start_date || filters.end_date) && (
              <button
                onClick={() => {
                  const reset = {
                    isActive: 'true',
                    plan_id: '',
                    search: '',
                    price_min: '',
                    price_max: '',
                    start_date: '',
                    end_date: ''
                  };
                  setFilters(reset);
                  fetchSubscriptions(reset);
                }}
                className="text-sm font-medium text-red-600 hover:text-red-700 px-2 py-1 flex items-center gap-1 active:scale-95 transition-transform"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.filter(s => s.isActive).map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-gray-500">
                            {s.user?.profileImage ? (
                              <img src={s.user.profileImage} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {s.user?.displayName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {s.user?.displayName !== s.user?.email ? s.user?.email : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="font-medium text-gray-900">{s.plan?.plan_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {s.plan?.price !== undefined ? `$${s.plan.price}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{s.provider || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {s.startedAt ? new Date(s.startedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {s.endedAt ? new Date(s.endedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-flex items-center gap-2">
                          <button title="View history" className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50" onClick={() => viewSubscription(s)}>
                            <Eye className="h-4 w-4" />
                          </button>
                          <button title={s.isActive ? 'Deactivate' : 'Activate'} className={`p-1.5 rounded-md ${s.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} onClick={() => toggleSubscriptionActive(s)}>
                            <Power className="h-4 w-4" />
                          </button>
                          <button title="Delete" className="p-1.5 rounded-md text-red-600 hover:bg-red-50" onClick={() => deleteSubscription(s)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subscriptions.filter(s => s.isActive).length === 0 && (
                    <tr>
                      <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={8}>
                        No active subscriptions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Modal: show all subscriptions/plans for selected user */}
        {selectedPlans && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Subscriptions for {selectedUser?.displayName || 'User'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-md hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedPlans.map((p) => (
                        <tr key={p._id} className={p.isActive ? 'bg-green-50' : ''}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {p.plan?.plan_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {p.plan?.price !== undefined ? `$${p.plan.price}` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{p.provider || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{p.startedAt ? new Date(p.startedAt).toLocaleDateString() : (p.start_date ? new Date(p.start_date).toLocaleDateString() : '-')}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{p.endedAt ? new Date(p.endedAt).toLocaleDateString() : (p.end_date ? new Date(p.end_date).toLocaleDateString() : '-')}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {p.isActive ? <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">Active</span> : <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">Inactive</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
