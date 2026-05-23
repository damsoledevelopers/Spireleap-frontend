'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { clearDropdownOptionsCache } from '../../lib/dropdownsApi'
import { Plus, Edit, Trash2, MapPin, X } from 'lucide-react'
import toast from 'react-hot-toast'
import SearchableSelect from '../Common/SearchableSelect'
import { useConfirmDialog } from '../Common/useConfirmDialog'

const emptyForm = {
  country: '',
  state: '',
  city: '',
  citiesSelected: [],
  isActive: true
}

export default function LocationManagement() {
  const { checkPermission } = useAuth()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [geo, setGeo] = useState({ countries: [], states: [], cities: [] })
  const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false })
  const cityOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...(geo.cities || []),
        String(formData.city || '').trim(),
        ...((Array.isArray(formData.citiesSelected) ? formData.citiesSelected : []).map((c) => String(c || '').trim()))
      ].filter(Boolean))
    ).sort((a, b) => a.localeCompare(b))
  }, [geo.cities, formData.city, formData.citiesSelected])

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchCountries = async () => {
    try {
      setGeoLoading((p) => ({ ...p, countries: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions')
      const data = await res.json()
      const countries = Array.isArray(data?.data)
        ? data.data.map((c) => String(c?.name || '').trim()).filter(Boolean)
        : []
      countries.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, countries }))
    } catch (error) {
      console.error('Error fetching countries:', error)
      setGeo((p) => ({ ...p, countries: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, countries: false }))
    }
  }

  const fetchStates = async (country) => {
    if (!country) {
      setGeo((p) => ({ ...p, states: [], cities: [] }))
      return
    }
    try {
      setGeoLoading((p) => ({ ...p, states: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      })
      const data = await res.json()
      const states = Array.isArray(data?.data?.states)
        ? data.data.states.map((s) => String(s?.name || '').trim()).filter(Boolean)
        : []
      states.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, states, cities: [] }))
    } catch (error) {
      console.error('Error fetching states:', error)
      setGeo((p) => ({ ...p, states: [], cities: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, states: false }))
    }
  }

  const fetchCities = async (country, state) => {
    if (!country || !state) {
      setGeo((p) => ({ ...p, cities: [] }))
      return
    }
    try {
      setGeoLoading((p) => ({ ...p, cities: true }))
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state })
      })
      const data = await res.json()
      const cities = Array.isArray(data?.data)
        ? data.data.map((c) => String(c || '').trim()).filter(Boolean)
        : []
      cities.sort((a, b) => a.localeCompare(b))
      setGeo((p) => ({ ...p, cities }))
    } catch (error) {
      console.error('Error fetching cities:', error)
      setGeo((p) => ({ ...p, cities: [] }))
    } finally {
      setGeoLoading((p) => ({ ...p, cities: false }))
    }
  }

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const res = await api.get('/settings/locations')
      setLocations(res.data.locations || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast.error('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setFormData(emptyForm)

  const openCreate = () => {
    resetForm()
    setEditingLocation(null)
    setShowModal(true)
    fetchCountries()
  }

  const openEdit = async (loc) => {
    setEditingLocation(loc)
    setFormData({
      country: loc.country || '',
      state: loc.state || '',
      city: loc.city || '',
      citiesSelected: [],
      isActive: loc.isActive !== false
    })
    setShowModal(true)
    fetchCountries()
    if (loc.country) {
      await fetchStates(loc.country)
      if (loc.state) {
        await fetchCities(loc.country, loc.state)
      }
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingLocation(null)
    resetForm()
  }

  const validateForm = () => {
    if (!formData.country?.trim()) return 'Country is required'
    const singleCity = String(formData.city || '').trim()
    const selectedCities = Array.isArray(formData.citiesSelected) ? formData.citiesSelected : []
    if (selectedCities.length === 0 && !singleCity) return 'City is required'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) {
      toast.error(err)
      return
    }

    const country = formData.country.trim()
    const state = String(formData.state || '').trim()
    const selectedCities = Array.isArray(formData.citiesSelected)
      ? formData.citiesSelected.map((c) => String(c || '').trim()).filter(Boolean)
      : []
    const cities =
      selectedCities.length > 0
        ? selectedCities
        : [String(formData.city || '').trim()].filter(Boolean)
    const isActive = !!formData.isActive

    try {
      setSaving(true)
      if (editingLocation) {
        const primaryCity = String(formData.city || '').trim() || cities[0] || ''
        await api.put(`/settings/locations/${editingLocation._id}`, {
          country,
          state,
          city: primaryCity,
          isActive
        })
        toast.success('Location updated successfully')
      } else {
        // Use bulk endpoint so multiple cities can be created at once (idempotent)
        await api.post('/settings/locations/bulk', { country, state, cities, isActive })
        toast.success(cities.length > 1 ? 'Locations created successfully' : 'Location created successfully')
      }
      clearDropdownOptionsCache()
      closeModal()
      fetchLocations()
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        'Failed to save location'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Location',
      message: 'Are you sure you want to delete this location?',
      confirmText: 'Delete',
      tone: 'danger'
    })
    if (!ok) return
    try {
      await api.delete(`/settings/locations/${id}`)
      toast.success('Location deleted successfully')
      clearDropdownOptionsCache()
      fetchLocations()
    } catch (error) {
      toast.error('Failed to delete location')
    }
  }

  const toggleActive = async (loc) => {
    const next = !(loc.isActive !== false)
    setLocations((prev) => prev.map((l) => (l._id === loc._id ? { ...l, isActive: next } : l)))
    try {
      await api.put(`/settings/locations/${loc._id}`, { isActive: next })
      clearDropdownOptionsCache()
      toast.success(`Location marked ${next ? 'Active' : 'Inactive'}`)
    } catch (error) {
      setLocations((prev) => prev.map((l) => (l._id === loc._id ? { ...l, isActive: loc.isActive !== false } : l)))
      toast.error('Failed to update status')
    }
  }

  return (
    <div>
      <div className="flex justify-end items-center mb-6">
        {checkPermission('settings', 'create') && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            New Location
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="table-scroll max-h-[340px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State / Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No locations found</p>
                        <p className="text-sm mt-1">Add locations to power filters and forms</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  locations.map((loc) => {
                    const isActive = loc.isActive !== false
                    return (
                      <tr key={loc._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loc.country}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{loc.state || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{loc.city}</td>
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
                                onClick={() => toggleActive(loc)}
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
                              <button onClick={() => openEdit(loc)} className="text-primary-600 hover:text-primary-900">
                                <Edit className="h-5 w-5" />
                              </button>
                            )}
                            {checkPermission('settings', 'delete') && (
                              <button onClick={() => handleDelete(loc._id)} className="text-red-600 hover:text-red-900">
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
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{editingLocation ? 'Edit Location' : 'Create Location'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Country<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                  <SearchableSelect
                    id="location-country"
                    name="country"
                    required
                    value={formData.country}
                    onChange={(e) => {
                      const country = e.target.value
                      setFormData((p) => ({
                        ...p,
                        country,
                        state: '',
                        city: '',
                        citiesSelected: []
                      }))
                      setGeo((p) => ({ ...p, states: [], cities: [] }))
                      fetchStates(country)
                    }}
                    options={geo.countries.map((c) => ({ value: c, label: c }))}
                    disabled={geoLoading.countries}
                    clearOnBackspace
                    placeholder={geoLoading.countries ? 'Loading countries...' : 'Select country'}
                    searchable={false}
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 text-left"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">State / Region</label>
                  <SearchableSelect
                    id="location-state"
                    name="state"
                    value={formData.state}
                    onChange={(e) => {
                      const state = e.target.value
                      const country = formData.country
                      setFormData((p) => ({ ...p, state, city: '', citiesSelected: [] }))
                      setGeo((p) => ({ ...p, cities: [] }))
                      fetchCities(country, state)
                    }}
                    options={geo.states.map((s) => ({ value: s, label: s }))}
                    disabled={!formData.country || geoLoading.states}
                    clearOnBackspace
                    placeholder={
                      !formData.country
                        ? 'Select country first'
                        : geoLoading.states
                          ? 'Loading states...'
                            : 'Select state'
                    }
                    searchable={false}
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 text-left"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">City<span className="text-red-500 ml-0.5" aria-hidden="true">*</span></label>
                  <SearchableSelect
                    id="location-city"
                    name="city"
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    options={cityOptions.map((c) => ({ value: c, label: c }))}
                    disabled={!formData.country || !formData.state || geoLoading.cities}
                    clearOnBackspace
                    placeholder={
                      !formData.country
                        ? 'Select country first'
                        : !formData.state
                          ? 'Select state first'
                          : geoLoading.cities
                            ? 'Loading cities...'
                            : 'Select city'
                    }
                    searchable={false}
                    buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 text-left"
                  />
                  {!editingLocation && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = String(formData.city || '').trim()
                            if (!next) return
                            setFormData((p) => {
                              const prev = Array.isArray(p.citiesSelected) ? p.citiesSelected : []
                              if (prev.includes(next)) return p
                              return { ...p, citiesSelected: [...prev, next] }
                            })
                          }}
                          disabled={!String(formData.city || '').trim()}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                          Add city
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, citiesSelected: [] }))}
                          disabled={!Array.isArray(formData.citiesSelected) || formData.citiesSelected.length === 0}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>

                      {Array.isArray(formData.citiesSelected) && formData.citiesSelected.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {formData.citiesSelected.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-800 border border-primary-100 rounded-full text-xs"
                            >
                              {c}
                              <button
                                type="button"
                                onClick={() => setFormData((p) => ({
                                  ...p,
                                  citiesSelected: (Array.isArray(p.citiesSelected) ? p.citiesSelected : []).filter((x) => x !== c)
                                }))}
                                className="text-primary-700 hover:text-primary-900"
                                aria-label={`Remove ${c}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="loc-active"
                    type="checkbox"
                    checked={!!formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="loc-active" className="text-sm text-gray-700">
                    Active (visible on site)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingLocation ? 'Update' : 'Create'}
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
