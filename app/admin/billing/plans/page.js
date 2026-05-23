'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { api } from '../../../../lib/api'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Save, Trash2, Edit, X, Search, ChevronDown } from 'lucide-react'
import SearchableSelect from '../../../../components/Common/SearchableSelect'
import { useConfirmDialog } from '../../../../components/Common/useConfirmDialog'
import { ISO_4217_CURRENCIES } from '../../../../lib/currencyIso4217'

const PLAN_CURRENCY_OPTIONS = ISO_4217_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`
}))

const VALIDITY_DAY_PRESETS = [7, 14, 30, 60, 90, 180, 365, 730]

function buildValidityDayOptions(currentDays) {
  const nums = new Set(VALIDITY_DAY_PRESETS)
  const n = Number(currentDays)
  if (Number.isFinite(n) && n > 0) nums.add(n)
  return [...nums]
    .sort((a, b) => a - b)
    .map((d) => ({
      value: String(d),
      label: d === 1 ? '1 day' : `${d} days`
    }))
}

const emptyForm = {
  plan_name: '',
  price: 0,
  currency: 'INR',
  billing_cycle: 'monthly',
  validity_days: 30,
  features: [],
  description: '',
  is_active: true
}

export default function AdminBillingPlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [featuresText, setFeaturesText] = useState('')
  const [openFilter, setOpenFilter] = useState(null) // 'cycle' or 'status' or null
  const [filters, setFilters] = useState({
    search: '',
    interval: '',
    isActive: '',
    price_min: '',
    price_max: ''
  })
  const sanitizePlanName = (v) => String(v || '').replace(/[^a-zA-Z0-9\s.'-]/g, '')
  const sanitizeDecimal = (v) => {
    const s = String(v ?? '').replace(/[^\d.]/g, '')
    const firstDot = s.indexOf('.')
    if (firstDot === -1) return s
    return s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const title = useMemo(() => (editingPlan ? 'Edit Plan' : 'Add Plan'), [editingPlan])
  const validityDayOptions = useMemo(
    () => buildValidityDayOptions(form.validity_days),
    [form.validity_days]
  )

  const priceFilterButtonLabel = useMemo(() => {
    const c = filters.currency || 'INR'
    const min = String(filters.price_min || '').trim()
    const max = String(filters.price_max || '').trim()
    if (!min && !max) return `${c} · Price range`
    return `${c} ${min || '0'} – ${max || 'Any'}`
  }, [filters.currency, filters.price_min, filters.price_max])

  const statusFilterButtonLabel = useMemo(() => {
    if (filters.isActive === 'true') return 'Enabled'
    if (filters.isActive === 'false') return 'Disabled'
    return 'All Status'
  }, [filters.isActive])

  const cycleFilterButtonLabel = useMemo(() => {
    if (filters.interval === 'monthly') return 'Monthly'
    if (filters.interval === 'yearly') return 'Yearly'
    return 'All Cycles'
  }, [filters.interval])

  const fetchPlans = async (currentFilters = null) => {
    try {
      setLoading(true)
      const targetFilters = currentFilters || filters
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(targetFilters).filter(([_, v]) => v !== ''))
      )
      const res = await api.get(`/subscriptions/plans?${params.toString()}`)
      setPlans(res.data.plans || [])
    } catch (err) {
      console.error('Failed to fetch plans:', err)
      toast.error('Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const openAdd = () => {
    setEditingPlan(null)
    setForm(emptyForm)
    setFeaturesText('')
    setShowModal(true)
  }

  const openEdit = (plan) => {
    setEditingPlan(plan)
    setForm({
      plan_name: plan.plan_name || plan.name || '',
      price: plan.price || 0,
      billing_cycle: plan.billing_cycle || plan.interval || 'monthly',
      validity_days: (() => {
        const vd = Number(plan.validity_days)
        return Number.isFinite(vd) && vd > 0 ? vd : 30
      })(),
      features: Array.isArray(plan.features) ? plan.features : [],
      description: plan.description || '',
      is_active: (plan.is_active !== undefined ? plan.is_active : plan.isActive) !== false
    })
    setFeaturesText((Array.isArray(plan.features) ? plan.features : []).join('\n'))
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPlan(null)
    setForm(emptyForm)
    setFeaturesText('')
  }

  const savePlan = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!form.plan_name || form.plan_name !== sanitizePlanName(form.plan_name)) {
        toast.error('Plan name must be alphanumeric')
        setSaving(false)
        return
      }
      if (!form.price || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
        toast.error('Enter a valid price')
        setSaving(false)
        return
      }
      if (!form.validity_days || Number.isNaN(Number(form.validity_days)) || Number(form.validity_days) < 0) {
        toast.error('Enter valid validity days')
        setSaving(false)
        return
      }

      const payload = {
        name: form.plan_name,
        price: Number(form.price),
        currency: String(form.currency || 'INR').trim().toUpperCase(),
        interval: form.billing_cycle,
        validity_days: Number(form.validity_days),
        features: featuresText
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean),
        description: form.description,
        isActive: !!form.is_active
      }

      if (editingPlan?._id) {
        await api.put(`/subscriptions/plans/${editingPlan._id}`, payload)
        toast.success('Plan updated')
      } else {
        await api.post('/subscriptions/plans', payload)
        toast.success('Plan created')
      }

      closeModal()
      fetchPlans()
    } catch (err) {
      console.error('Save plan error:', err)
      toast.error(err.response?.data?.message || 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  const deletePlan = async (planId) => {
    const ok = await confirm({
      title: 'Delete Plan',
      message: 'Delete this plan?',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return
    try {
      await api.delete(`/subscriptions/plans/${planId}`)
      toast.success('Plan deleted')
      fetchPlans()
    } catch (err) {
      console.error('Delete plan error:', err)
      toast.error(err.response?.data?.message || 'Failed to delete plan')
    }
  }

  const toggleActive = async (plan) => {
    try {
      await api.put(`/subscriptions/plans/${plan._id}`, { isActive: !plan.isActive })
      toast.success('Plan updated')
      fetchPlans()
    } catch (err) {
      console.error('Toggle plan error:', err)
      toast.error(err.response?.data?.message || 'Failed to update plan')
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
            <h1 className="text-2xl font-bold text-gray-900">Billing Plans</h1>
            <p className="mt-1 text-sm text-gray-500">Create and manage pricing plans</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPlans} className="btn btn-secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button onClick={openAdd} className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[300px] max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by plan name or description..."
              className="form-input pl-10 pr-10 w-full"
              value={filters.search}
              onChange={(e) => {
                const val = e.target.value;
                setFilters(prev => ({ ...prev, search: val }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchPlans();
              }}
            />
            {filters.search && (
              <button
                onClick={() => {
                  const newFilters = { ...filters, search: '' };
                  setFilters(newFilters);
                  fetchPlans(newFilters);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Status Dropdown */}
            <div className="relative">
              <button
                type="button"
                title={statusFilterButtonLabel}
                onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 min-w-0 max-w-[min(100%,220px)] ${openFilter === 'status' || filters.isActive !== ''
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <div className={`h-2 w-2 shrink-0 rounded-full ${filters.isActive === 'true' ? 'bg-green-500' : filters.isActive === 'false' ? 'bg-gray-400' : 'bg-primary-500'}`} />
                <span className="truncate text-sm">{statusFilterButtonLabel}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openFilter === 'status' ? 'rotate-180' : ''}`} />
              </button>

              {openFilter === 'status' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${filters.isActive === '' ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => {
                        const newFilters = { ...filters, isActive: '' };
                        setFilters(newFilters);
                        fetchPlans(newFilters);
                        setOpenFilter(null);
                      }}
                    >
                      All Status
                      {filters.isActive === '' && <div className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${filters.isActive === 'true' ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => {
                        const newFilters = { ...filters, isActive: 'true' };
                        setFilters(newFilters);
                        fetchPlans(newFilters);
                        setOpenFilter(null);
                      }}
                    >
                      Enabled
                      {filters.isActive === 'true' && <div className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${filters.isActive === 'false' ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => {
                        const newFilters = { ...filters, isActive: 'false' };
                        setFilters(newFilters);
                        fetchPlans(newFilters);
                        setOpenFilter(null);
                      }}
                    >
                      Disabled
                      {filters.isActive === 'false' && <div className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Price Range Dropdown */}
            <div className="relative">
              <button
                type="button"
                title={priceFilterButtonLabel}
                onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 max-w-[min(100%,300px)] ${openFilter === 'price' ||
                filters.price_min ||
                filters.price_max ||
                (filters.currency && filters.currency !== 'INR')
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <span className="truncate text-sm">{priceFilterButtonLabel}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openFilter === 'price' ? 'rotate-180' : ''}`} />
              </button>

              {openFilter === 'price' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Price</h3>
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Currency</label>
                      <SearchableSelect
                        value={filters.currency || 'INR'}
                        onChange={(e) => setFilters((prev) => ({ ...prev, currency: e.target.value || 'INR' }))}
                        options={PLAN_CURRENCY_OPTIONS}
                        placeholder="Select currency"
                        buttonClassName="form-input w-full bg-white text-sm"
                        searchPlaceholder="Search currency..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Min Price</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          className="form-input text-sm"
                          value={filters.price_min}
                          onChange={(e) => setFilters(prev => ({ ...prev, price_min: sanitizeDecimal(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Max Price</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Any"
                          className="form-input text-sm"
                          value={filters.price_max}
                          onChange={(e) => setFilters(prev => ({ ...prev, price_max: sanitizeDecimal(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 text-sm text-gray-500 hover:text-gray-700 font-medium py-2"
                        onClick={() => {
                          const newFilters = { ...filters, price_min: '', price_max: '', currency: 'INR' };
                          setFilters(newFilters);
                          fetchPlans(newFilters);
                          setOpenFilter(null);
                        }}
                      >
                        Clear
                      </button>
                      <button
                        className="flex-1 bg-primary-600 text-white rounded-lg text-sm font-medium py-2 hover:bg-primary-700 transition-colors"
                        onClick={() => {
                          fetchPlans()
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

            {/* Cycle Dropdown */}
            <div className="relative">
              <button
                type="button"
                title={cycleFilterButtonLabel}
                onClick={() => setOpenFilter(openFilter === 'cycle' ? null : 'cycle')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 min-w-0 max-w-[min(100%,200px)] ${openFilter === 'cycle' || filters.interval !== ''
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <span className="truncate text-sm">{cycleFilterButtonLabel}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openFilter === 'cycle' ? 'rotate-180' : ''}`} />
              </button>

              {openFilter === 'cycle' && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${filters.interval === '' ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => {
                        const newFilters = { ...filters, interval: '' };
                        setFilters(newFilters);
                        fetchPlans(newFilters);
                        setOpenFilter(null);
                      }}
                    >
                      All Cycles
                      {filters.interval === '' && <div className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${filters.interval === 'monthly' ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => {
                        const newFilters = { ...filters, interval: 'monthly' };
                        setFilters(newFilters);
                        fetchPlans(newFilters);
                        setOpenFilter(null);
                      }}
                    >
                      Monthly
                      {filters.interval === 'monthly' && <div className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${filters.interval === 'yearly' ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                      onClick={() => {
                        const newFilters = { ...filters, interval: 'yearly' };
                        setFilters(newFilters);
                        fetchPlans(newFilters);
                        setOpenFilter(null);
                      }}
                    >
                      Yearly
                      {filters.interval === 'yearly' && <div className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        <div className="card">
          <div className="card-body p-0">
            <div className="table-scroll">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Cycle</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Validity</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Active</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((p) => (
                    <tr key={p._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{p.plan_name || p.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{p.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        <span className="text-gray-500 font-medium mr-1">{p.currency || 'INR'}</span>
                        {p.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 capitalize">{p.interval}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{p.validity_days || 0} Days</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(p)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${p.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {(p.is_active !== undefined ? p.is_active : p.isActive) ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deletePlan(p._id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr>
                      <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={6}>
                        No plans yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4 sm:my-0 max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <button onClick={closeModal} className="p-2 rounded-md hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={savePlan} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Plan Name
                      <span className="text-red-500 ml-0.5" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      className="form-input"
                      value={form.plan_name}
                      onChange={(e) => setForm(prev => ({ ...prev, plan_name: sanitizePlanName(e.target.value) }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Currency
                      <span className="text-red-500 ml-0.5" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <SearchableSelect
                      value={form.currency || 'INR'}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          currency: (e.target.value || 'INR').toString().toUpperCase()
                        }))
                      }
                      options={PLAN_CURRENCY_OPTIONS}
                      placeholder="Select currency"
                      buttonClassName="form-input w-full bg-white"
                      searchPlaceholder="Search currency..."
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Price
                      <span className="text-red-500 ml-0.5" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <div className="flex rounded-lg border-2 border-gray-300 shadow-sm focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all duration-200 overflow-hidden">
                      <span
                        className="inline-flex items-center px-3 bg-gray-50 text-gray-700 text-sm font-semibold border-r-2 border-gray-300 shrink-0 min-w-[3.25rem] justify-center"
                        aria-hidden="true"
                      >
                        {form.currency || 'INR'}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="block w-full min-w-0 border-0 shadow-none focus:ring-0 sm:text-sm px-3 py-2 text-gray-900"
                        value={form.price}
                        onChange={(e) => setForm(prev => ({ ...prev, price: sanitizeDecimal(e.target.value) }))}
                        required
                        aria-label="Price amount"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">
                      Billing Cycle
                      <span className="text-red-500 ml-0.5" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <SearchableSelect
                      value={form.billing_cycle}
                      onChange={(e) => setForm(prev => ({ ...prev, billing_cycle: e.target.value }))}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'yearly', label: 'Yearly' }
                      ]}
                      placeholder="Billing cycle"
                      buttonClassName="form-input w-full bg-white"
                      searchable={false}
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Validity Days
                      <span className="text-red-500 ml-0.5" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <SearchableSelect
                      value={String(form.validity_days)}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, validity_days: Number(e.target.value) }))
                      }
                      options={validityDayOptions}
                      placeholder="Select validity"
                      buttonClassName="form-input w-full bg-white"
                      searchable={false}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <SearchableSelect
                      value={form.is_active ? 'true' : 'false'}
                      onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                      options={[
                        { value: 'true', label: 'Enabled' },
                        { value: 'false', label: 'Disabled' }
                      ]}
                      placeholder="Status"
                      buttonClassName="form-input w-full bg-white"
                      searchable={false}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label">Features (one per line)</label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder="Enter Features"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white border-t border-gray-100 mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog />
    </DashboardLayout>
  )
}
