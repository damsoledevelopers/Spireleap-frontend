'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { Plus, Edit, Trash2, Search, Coins } from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '../Common/useConfirmDialog'
import SearchableSelect from '../Common/SearchableSelect'
import { ISO_4217_CURRENCIES, findCurrencyByCode } from '../../lib/currencyIso4217'
import { clearDropdownOptionsCache } from '../../lib/dropdownsApi'

const BASE_CURRENCY_CODE = 'AED'

const CURRENCY_SELECT_OPTIONS = ISO_4217_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`
}))

const normalizedCountryKey = (s) => String(s || '').trim().toLowerCase()

const emptyForm = {
  countryName: '',
  currencyName: '',
  currencyCode: '',
  aedRate: '',
  status: true
}

export default function CurrencyManagement({ onCurrenciesChange }) {
  const { checkPermission } = useAuth()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [currencies, setCurrencies] = useState([])
  const [hiddenCurrencies, setHiddenCurrencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [countryList, setCountryList] = useState([])
  const [countryListLoading, setCountryListLoading] = useState(false)

  useEffect(() => {
    fetchCurrencies()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setCountryListLoading(true)
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
        const data = await res.json()
        const countries = Array.isArray(data?.data)
          ? data.data.map((c) => String(c?.name || '').trim()).filter(Boolean)
          : []
        countries.sort((a, b) => a.localeCompare(b))
        if (!cancelled) setCountryList(countries)
      } catch (e) {
        console.error('Error loading countries:', e)
        if (!cancelled) setCountryList([])
      } finally {
        if (!cancelled) setCountryListLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const countrySelectOptions = useMemo(() => {
    const taken = new Set(
      currencies
        .filter((c) => !editingCurrency || String(c._id) !== String(editingCurrency._id))
        .map((c) => normalizedCountryKey(c.countryName))
    )
    const currentKey = editingCurrency ? normalizedCountryKey(editingCurrency.countryName) : ''
    return countryList
      .filter((name) => {
        const key = normalizedCountryKey(name)
        if (currentKey && key === currentKey) return true
        return !taken.has(key)
      })
      .map((name) => ({ value: name, label: name }))
  }, [countryList, currencies, editingCurrency])

  const currencyOptionsForSelect = useMemo(() => {
    const code = String(formData.currencyCode || '').trim().toUpperCase()
    if (!code) return CURRENCY_SELECT_OPTIONS
    const exists = CURRENCY_SELECT_OPTIONS.some((o) => o.value === code)
    if (exists) return CURRENCY_SELECT_OPTIONS
    return [{ value: code, label: `${code} — (other)` }, ...CURRENCY_SELECT_OPTIONS]
  }, [formData.currencyCode])

  const fetchCurrencies = async () => {
    try {
      setLoading(true)
      const res = await api.get('/currency')
      setCurrencies(res.data.currencies || [])
    } catch (error) {
      console.error('Error fetching currencies:', error)
      toast.error('Failed to load currencies')
    } finally {
      setLoading(false)
    }
  }

  const filteredCurrencies = useMemo(() => {
    const t = searchTerm.toLowerCase().trim()
    if (!t) return currencies
    return currencies.filter((c) => {
      return (
        String(c.countryName || '').toLowerCase().includes(t) ||
        String(c.currencyName || '').toLowerCase().includes(t) ||
        String(c.currencyCode || '').toLowerCase().includes(t)
      )
    })
  }, [currencies, searchTerm])

  const resetForm = () => setFormData(emptyForm)

  const openCreate = () => {
    resetForm()
    setEditingCurrency(null)
    setShowModal(true)
  }

  const openEdit = (currency) => {
    setEditingCurrency(currency)
    setFormData({
      countryName: currency.countryName || '',
      currencyName: currency.currencyName || '',
      currencyCode: currency.currencyCode || '',
      aedRate: currency.aedRate ?? '',
      status: currency.status !== false
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCurrency(null)
    resetForm()
  }

  const validateForm = () => {
    if (!formData.countryName?.trim()) return 'Select a country'
    const code = String(formData.currencyCode).trim().toUpperCase()
    if (!code) return 'Enter a currency code'
    if (!/^[A-Z0-9]{3,10}$/.test(code)) return 'Currency code must be 3–10 characters (A–Z / 0–9)'
    const cur = findCurrencyByCode(code)
    let name = (formData.currencyName?.trim() || cur?.name || '').trim()
    if (!name && /^[A-Z0-9]{3,10}$/.test(code)) name = code
    if (!name) return 'Select a currency or enter a valid currency code'
    if (formData.aedRate === '' || formData.aedRate === null || formData.aedRate === undefined)
      return `${BASE_CURRENCY_CODE} rate is required`
    const rate = Number(formData.aedRate)
    if (Number.isNaN(rate) || rate < 0) return `${BASE_CURRENCY_CODE} rate must be a number ≥ 0`
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) {
      toast.error(err)
      return
    }

    const code = String(formData.currencyCode).trim().toUpperCase()
    const cur = findCurrencyByCode(code)
    let currencyName = (formData.currencyName?.trim() || cur?.name || '').trim()
    if (!currencyName && /^[A-Z0-9]{3,10}$/.test(code)) currencyName = code

    const payload = {
      countryName: formData.countryName.trim(),
      currencyName,
      currencyCode: code,
      aedRate: Number(formData.aedRate),
      status: !!formData.status
    }

    try {
      setSaving(true)
      if (editingCurrency) {
        await api.put(`/currency/${editingCurrency._id}`, {
          currencyName: payload.currencyName,
          aedRate: payload.aedRate,
          status: payload.status
        })
        toast.success('Currency updated successfully')
      } else {
        const createRes = await api.post('/currency', payload)
        if (createRes.data?.restored) {
          toast.success(`${payload.currencyCode} was restored and updated`)
        } else {
          toast.success('Currency created successfully')
        }
      }
      closeModal()
      clearDropdownOptionsCache()
      fetchCurrencies()
      onCurrenciesChange?.()
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        'Failed to save currency'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (currency) => {
    try {
      await api.post(`/currency/${currency._id}/restore`)
      toast.success(`${currency.currencyCode} restored`)
      clearDropdownOptionsCache()
      fetchCurrencies()
      onCurrenciesChange?.()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restore currency')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Currency',
      message: 'Are you sure you want to delete this currency?',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return
    try {
      await api.delete(`/currency/${id}`)
      toast.success('Currency deleted successfully')
      clearDropdownOptionsCache()
      fetchCurrencies()
      onCurrenciesChange?.()
    } catch (error) {
      toast.error('Failed to delete currency')
    }
  }

  const toggleStatus = async (currency) => {
    const nextStatus = !(currency.status !== false)
    // Optimistic update
    setCurrencies((prev) => prev.map((c) => (c._id === currency._id ? { ...c, status: nextStatus } : c)))
    try {
      await api.put(`/currency/${currency._id}`, { status: nextStatus })
      clearDropdownOptionsCache()
      onCurrenciesChange?.()
      toast.success(`Currency marked ${nextStatus ? 'Active' : 'Inactive'}`)
    } catch (error) {
      // Revert on failure
      setCurrencies((prev) => prev.map((c) => (c._id === currency._id ? { ...c, status: currency.status !== false } : c)))
      toast.error('Failed to update status')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search currencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        {checkPermission('settings', 'create') && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            New Currency
          </button>
        )}
      </div>

      {hiddenCurrencies.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {hiddenCurrencies.length} hidden currency record(s) — these do not appear in the list but block duplicate codes.
          </p>
          <ul className="mt-2 space-y-2">
            {hiddenCurrencies.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-800">
                <span>
                  {c.countryName} — {c.currencyCode} ({c.currencyName})
                </span>
                {checkPermission('settings', 'edit') && (
                  <button
                    type="button"
                    onClick={() => handleRestore(c)}
                    className="px-3 py-1 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
                  >
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="max-h-[340px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current {BASE_CURRENCY_CODE} Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCurrencies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Coins className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No currencies found</p>
                        <p className="text-sm mt-1">
                          {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first currency'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCurrencies.map((currency) => {
                    const isActive = currency.status !== false
                    return (
                      <tr key={currency._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{currency.countryName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{currency.currencyName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{currency.currencyCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          1 {currency.currencyCode} = {Number(currency.aedRate).toFixed(4)} {BASE_CURRENCY_CODE}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                            {checkPermission('settings', 'edit') && (
                              <button
                                type="button"
                                onClick={() => toggleStatus(currency)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  isActive ? 'bg-primary-600' : 'bg-gray-300'
                                }`}
                                title="Toggle status"
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isActive ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {checkPermission('settings', 'edit') && (
                              <button onClick={() => openEdit(currency)} className="text-primary-600 hover:text-primary-900">
                                <Edit className="h-5 w-5" />
                              </button>
                            )}
                            {checkPermission('settings', 'delete') && (
                              <button onClick={() => handleDelete(currency._id)} className="text-red-600 hover:text-red-900">
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingCurrency ? 'Edit Currency' : 'Create New Currency'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Select country<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.countryName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, countryName: e.target.value }))}
                    options={countrySelectOptions}
                    placeholder={countryListLoading ? 'Loading countries…' : 'Select country'}
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg text-left bg-white disabled:bg-gray-50"
                    searchPlaceholder="Search country..."
                    disabled={!!editingCurrency || countryListLoading}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Only one currency entry per country</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Select currency<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.currencyCode}
                    onChange={(e) => {
                      const nextCode = e.target.value
                      const cur = findCurrencyByCode(nextCode)
                      setFormData((prev) => ({
                        ...prev,
                        currencyCode: nextCode,
                        currencyName: cur ? cur.name : ''
                      }))
                    }}
                    options={currencyOptionsForSelect}
                    placeholder="Select currency"
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg text-left bg-white disabled:bg-gray-50"
                    searchPlaceholder="Search currency..."
                    disabled={!!editingCurrency}
                    required
                  />
                </div>

                {formData.currencyCode ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Selected code</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {String(formData.currencyCode).toUpperCase()}
                      {formData.currencyName ? ` — ${formData.currencyName}` : ''}
                    </p>
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Current {BASE_CURRENCY_CODE} Rate<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={formData.aedRate}
                    onChange={(e) => setFormData({ ...formData, aedRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 1.0000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const rate = Number(formData.aedRate)
                      if (!Number.isFinite(rate) || rate < 0) return `1 unit = ? ${BASE_CURRENCY_CODE}`
                      return `1 unit = ${rate.toFixed(4)} ${BASE_CURRENCY_CODE}`
                    })()}
                  </p>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-bold text-gray-900">Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
                  >
                    {editingCurrency ? 'Update' : 'Create'} Currency
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  )
}

