'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { api } from '../../../../lib/api'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Save, Trash2, Edit, X, Search, ChevronDown, DollarSign } from 'lucide-react'

const emptyForm = {
  plan_name: '',
  price: 0,
  billing_cycle: 'monthly',
  validity_days: 0,
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

  const title = useMemo(() => (editingPlan ? 'Edit Plan' : 'Add Plan'), [editingPlan])

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
      validity_days: plan.validity_days || 0,
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
      const payload = {
        name: form.plan_name,
        price: Number(form.price),
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
    if (!window.confirm('Delete this plan?')) return
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
                onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${openFilter === 'status' || filters.isActive !== ''
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <div className={`h-2 w-2 rounded-full ${filters.isActive === 'true' ? 'bg-green-500' : filters.isActive === 'false' ? 'bg-gray-400' : 'bg-primary-500'}`} />
                <span>Status</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openFilter === 'status' ? 'rotate-180' : ''}`} />
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
                onClick={() => setOpenFilter(openFilter === 'price' ? null : 'price')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${openFilter === 'price' || filters.price_min || filters.price_max
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Price</span>
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
                          const newFilters = { ...filters, price_min: '', price_max: '' };
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
                onClick={() => setOpenFilter(openFilter === 'cycle' ? null : 'cycle')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${openFilter === 'cycle' || filters.interval !== ''
                  ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
              >
                <span>Cycle</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openFilter === 'cycle' ? 'rotate-180' : ''}`} />
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

            {(filters.search || filters.interval || filters.isActive || filters.price_min || filters.price_max) && (
              <button
                onClick={() => {
                  const reset = { search: '', interval: '', isActive: '', price_min: '', price_max: '' };
                  setFilters(reset);
                  fetchPlans(reset);
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cycle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((p) => (
                    <tr key={p._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{p.plan_name || p.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{p.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{p.price}</td>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <button onClick={closeModal} className="p-2 rounded-md hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={savePlan} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Plan Name</label>
                    <input
                      className="form-input"
                      value={form.plan_name}
                      onChange={(e) => setForm(prev => ({ ...prev, plan_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Billing Cycle</label>
                    <select
                      className="form-input"
                      value={form.billing_cycle}
                      onChange={(e) => setForm(prev => ({ ...prev, billing_cycle: e.target.value }))}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Validity Days</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.validity_days}
                      onChange={(e) => setForm(prev => ({ ...prev, validity_days: e.target.value }))}
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={form.is_active ? 'true' : 'false'}
                      onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
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
                    placeholder="Feature 1\nFeature 2\nFeature 3"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
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
    </DashboardLayout>
  )
}
