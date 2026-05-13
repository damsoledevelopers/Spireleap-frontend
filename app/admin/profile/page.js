'use client'

import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
    User,
    Mail,
    Phone,
    Camera,
    Save,
    Loader2,
    MapPin,
    Briefcase,
    FileText,
    Globe,
    Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import PhoneField from '../../../components/Common/PhoneField'
import SearchableSelect from '../../../components/Common/SearchableSelect'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '../../../lib/phone'
import {
    sanitizePostalDigits,
    isValidOptionalPostalDigits,
    OPTIONAL_POSTAL_DIGITS_MESSAGE
} from '../../../lib/postalCode'

const CLOUDINARY_PROFILE_MAX_BYTES = 5 * 1024 * 1024 // must match backend Cloudinary route
const DISK_PROFILE_MAX_BYTES = 10 * 1024 * 1024 // matches multer disk limit for /upload/profile-image
const PROFILE_IMAGE_ACCEPT_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

/** Full HTTPS URL (e.g. Cloudinary) or legacy relative upload path → absolute browser URL */
function resolveProfileImageUrl(url) {
    const u = typeof url === 'string' ? url.trim() : ''
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u
    const rawBase =
        (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
        'http://localhost:5000/api'
    const origin = String(rawBase).replace(/\/api\/?$/i, '')
    return `${origin}${u.startsWith('/') ? u : `/${u}`}`
}

export default function ProfilePage() {
    const { user, refreshUser } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
    const [uploading, setUploading] = useState(false)
    const [geo, setGeo] = useState({ countries: [], states: [], cities: [] })
    const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false })
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            country: '',
            zipCode: ''
        },
        profileImage: '',
        agentInfo: {
            bio: '',
            licenseNumber: '',
            specialties: [],
            languages: [],
            yearsOfExperience: 0
        }
    })

    useEffect(() => {
        fetchCountries()
    }, [])

    useEffect(() => {
        if (!user) {
            setLoading(false)
            return
        }

        const userId = user._id || user.id
        if (!userId) {
            setLoading(false)
            return
        }

        let cancelled = false

        const applyServerUser = (data) => {
            const parsedPhone = splitE164Phone(data.phone || '')
            setPhoneCountryCode(parsedPhone.countryCode || DEFAULT_COUNTRY_CODE)
            const img = typeof data.profileImage === 'string' ? data.profileImage.trim() : ''
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: parsedPhone.phone || '',
                address: {
                    street: data.address?.street || '',
                    city: data.address?.city || '',
                    state: data.address?.state || '',
                    country: data.address?.country || '',
                    zipCode: data.address?.zipCode || ''
                },
                profileImage: img,
                agentInfo: {
                    bio: data.agentInfo?.bio || '',
                    licenseNumber: data.agentInfo?.licenseNumber || '',
                    specialties: data.agentInfo?.specialties || [],
                    languages: data.agentInfo?.languages || [],
                    yearsOfExperience: data.agentInfo?.yearsOfExperience || 0
                }
            })
        }

        const load = async () => {
            setLoading(true)
            try {
                const { data } = await api.get(`/users/${userId}`)
                if (cancelled) return
                applyServerUser(data)
            } catch (err) {
                console.error('Profile: failed to load user from API, using session data', err)
                if (cancelled) return
                applyServerUser(user)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [user])

    useEffect(() => {
        const country = String(formData.address?.country || '').trim()
        const state = String(formData.address?.state || '').trim()
        if (country) {
            fetchStates(country)
        } else {
            setGeo((p) => ({ ...p, states: [], cities: [] }))
        }
        if (country && state) {
            fetchCities(country, state)
        } else {
            setGeo((p) => ({ ...p, cities: [] }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.address?.country, formData.address?.state])

    const mergedStates = useMemo(() => {
        return Array.from(new Set([...(geo.states || []), String(formData.address?.state || '').trim()].filter(Boolean)))
            .sort((a, b) => a.localeCompare(b))
    }, [geo.states, formData.address?.state])

    const mergedCities = useMemo(() => {
        return Array.from(new Set([...(geo.cities || []), String(formData.address?.city || '').trim()].filter(Boolean)))
            .sort((a, b) => a.localeCompare(b))
    }, [geo.cities, formData.address?.city])

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
            setGeo((p) => ({ ...p, states }))
        } catch (error) {
            console.error('Error fetching states:', error)
            setGeo((p) => ({ ...p, states: [] }))
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

    const handleInputChange = (e) => {
        const { name, value } = e.target || {}
        if (!name) return
        const sanitizeName = (v) => String(v || '').replace(/[^a-zA-Z\s.'-]/g, '')
        const nextValue = (name === 'firstName' || name === 'lastName') ? sanitizeName(value) : value
        if (name.includes('.')) {
            const [parent, child] = name.split('.')
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: nextValue
                }
            }))
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: nextValue
            }))
        }
    }

    const handleAddressChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [name]: value
            }
        }))
    }

    const handleImageUpload = async (e) => {
        const input = e.target
        const file = input.files?.[0]
        if (!file) return

        if (!PROFILE_IMAGE_ACCEPT_MIMES.includes(file.type)) {
            toast.error('Please choose a JPEG, PNG, GIF, or WebP image.')
            input.value = ''
            return
        }

        const isSuperAdmin = user?.role === 'super_admin'
        const maxBytes = isSuperAdmin ? CLOUDINARY_PROFILE_MAX_BYTES : DISK_PROFILE_MAX_BYTES
        if (file.size > maxBytes) {
            toast.error(`Image must be ${maxBytes / (1024 * 1024)}MB or smaller.`)
            input.value = ''
            return
        }

        const formDataUpload = new FormData()
        formDataUpload.append('image', file)
        const uploadUrl = isSuperAdmin
            ? '/upload/cloudinary/profile-image'
            : '/upload/profile-image'

        try {
            setUploading(true)
            const response = await api.post(uploadUrl, formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            const imageUrl =
                response.data?.secure_url ||
                response.data?.file?.url ||
                response.data?.url
            if (!imageUrl) {
                toast.error('Upload succeeded but no image URL was returned.')
                return
            }

            setFormData(prev => ({
                ...prev,
                profileImage: imageUrl
            }))

            const userId = user?._id || user?.id
            if (userId) {
                try {
                    await api.put(`/users/${userId}`, { profileImage: imageUrl })
                    await refreshUser()
                    toast.success('Profile image saved')
                } catch (persistErr) {
                    console.error('Failed to save profile image URL:', persistErr)
                    toast.error(
                        persistErr.response?.data?.message ||
                            'Image uploaded but could not save to your profile. Click Save Profile.'
                    )
                }
            } else {
                toast.success('Profile image uploaded — click Save Profile to keep it')
            }
        } catch (error) {
            console.error('Error uploading image:', error)
            const msg =
                error.response?.data?.message ||
                error.message ||
                'Failed to upload image'
            toast.error(msg)
        } finally {
            setUploading(false)
            input.value = ''
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const userId = user?._id || user?.id

            if (!userId) {
                toast.error('User information missing. Please refresh.')
                setSaving(false)
                return
            }

            if (!formData.firstName || formData.firstName !== String(formData.firstName).replace(/[^a-zA-Z\s.'-]/g, '')) {
                toast.error('First name must contain only alphabets')
                setSaving(false)
                return
            }
            if (!formData.lastName || formData.lastName !== String(formData.lastName).replace(/[^a-zA-Z\s.'-]/g, '')) {
                toast.error('Last name must contain only alphabets')
                setSaving(false)
                return
            }
            const e164Phone = formData.phone ? buildE164Phone(phoneCountryCode, formData.phone) : ''
            if (formData.phone && !e164Phone) {
                toast.error('Enter a valid phone number for the selected country')
                setSaving(false)
                return
            }
            if (formData.address?.zipCode && !isValidOptionalPostalDigits(formData.address.zipCode)) {
                toast.error(OPTIONAL_POSTAL_DIGITS_MESSAGE)
                setSaving(false)
                return
            }
            const payload = {
                ...formData,
                phone: e164Phone || formData.phone
            }
            await api.put(`/users/${userId}`, payload)
            await refreshUser()
            toast.success('Profile updated successfully')
        } catch (error) {
            console.error('Error updating profile:', error)
            const errorData = error.response?.data
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                // If it's a validation error array, show the first one or join them
                errorData.errors.forEach(err => {
                    toast.error(`${err.path}: ${err.msg}`)
                })
            } else {
                toast.error(errorData?.message || 'Failed to update profile')
            }
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-6">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                            Manage Profile
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Update your personal information, contact details, and professional bio.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profile Header Card */}
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-8">
                                {/* Photo + actions — one cluster so height matches name block */}
                                <div className="flex flex-row items-center justify-center md:justify-start gap-5 md:gap-6 shrink-0">
                                    <div className="relative flex-shrink-0">
                                        <div className="h-32 w-32 sm:h-36 sm:w-36 rounded-full ring-4 ring-gray-100 shadow-md overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                                            {formData.profileImage ? (
                                                <img
                                                    key={formData.profileImage}
                                                    src={resolveProfileImageUrl(formData.profileImage)}
                                                    alt="Profile"
                                                    className="h-full w-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <User className="h-16 w-16 sm:h-20 sm:w-20 text-gray-300" />
                                                </div>
                                            )}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-gray-900/55 flex items-center justify-center backdrop-blur-[1px]">
                                                    <Loader2 className="h-8 w-8 sm:h-9 sm:w-9 animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 min-w-0 w-[9.5rem] sm:w-auto">
                                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-center md:text-left">
                                            Profile Photo
                                        </span>
                                        <div className="flex flex-col gap-2">
                                            <label
                                                htmlFor="profile-avatar-upload"
                                                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-medium text-white shadow-sm transition-all cursor-pointer
                                                    ${uploading ? 'bg-primary-400 cursor-not-allowed opacity-80' : 'bg-primary-600 hover:bg-primary-700 hover:shadow active:scale-[0.98]'}`}
                                            >
                                                {uploading ? (
                                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                                ) : (
                                                    <Camera className="h-4 w-4 shrink-0" />
                                                )}
                                                <span>{uploading ? 'Uploading…' : 'Upload'}</span>
                                                <input
                                                    id="profile-avatar-upload"
                                                    type="file"
                                                    className="sr-only"
                                                    accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                                                    onChange={handleImageUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Name + meta — same row on md+, vertically centered with photo cluster */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left border-t border-gray-100 pt-5 md:border-t-0 md:pt-0 md:border-l md:pl-8 md:ml-2">
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                                        {formData.firstName} {formData.lastName}
                                    </h3>
                                    <p className="mt-1 text-sm font-medium text-gray-500 capitalize">
                                        {user?.role?.replace('_', ' ')}
                                    </p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Member since{' '}
                                        {user?.createdAt
                                            ? new Date(user.createdAt).toLocaleDateString(undefined, {
                                                  month: 'long',
                                                  year: 'numeric'
                                              })
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Information */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <User className="h-5 w-5 mr-2 text-primary-600" />
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900">
                                        First Name
                                        <span className="text-red-500 ml-0.5" aria-hidden="true">
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900">
                                        Last Name
                                        <span className="text-red-500 ml-0.5" aria-hidden="true">
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900">
                                        Email Address
                                        <span className="text-red-500 ml-0.5" aria-hidden="true">
                                            *
                                        </span>
                                    </label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                            <Mail className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            disabled
                                            className="flex-1 min-w-0 block w-full border border-gray-300 rounded-none rounded-r-md bg-gray-100 text-gray-500 p-2 sm:text-sm"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400">Email cannot be changed contact admin.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                                        <Phone className="h-4 w-4" />
                                        Phone Number
                                    </label>
                                    <PhoneField
                                        label=""
                                        countryCodeName="phoneCountryCode"
                                        phoneName="phone"
                                        countryCodeValue={phoneCountryCode}
                                        phoneValue={formData.phone}
                                        onCountryCodeChange={(value) => setPhoneCountryCode(value)}
                                        onPhoneChange={(value) =>
                                            setFormData((prev) => ({ ...prev, phone: value }))
                                        }
                                        showInlineError={Boolean(formData.phone)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address Information */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                                Address Details
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900">Street Address</label>
                                    <input
                                        type="text"
                                        name="street"
                                        value={formData.address.street}
                                        onChange={handleAddressChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900">Country</label>
                                        <SearchableSelect
                                            id="profile-country"
                                            name="country"
                                            value={formData.address.country}
                                            onChange={(e) => {
                                                const country = String(e.target.value || '').trim()
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    address: {
                                                        ...prev.address,
                                                        country,
                                                        state: '',
                                                        city: ''
                                                    }
                                                }))
                                                setGeo((p) => ({ ...p, states: [], cities: [] }))
                                                fetchStates(country)
                                            }}
                                            options={geo.countries.map((c) => ({ value: c, label: c }))}
                                            disabled={geoLoading.countries}
                                            clearOnBackspace
                                            placeholder={geoLoading.countries ? 'Loading countries...' : 'Select country'}
                                            searchable
                                            searchPlaceholder="Search country..."
                                            buttonClassName="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white text-left"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900">State</label>
                                        <SearchableSelect
                                            id="profile-state"
                                            name="state"
                                            value={formData.address.state}
                                            onChange={(e) => {
                                                const state = String(e.target.value || '').trim()
                                                const country = String(formData.address.country || '').trim()
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    address: {
                                                        ...prev.address,
                                                        state,
                                                        city: ''
                                                    }
                                                }))
                                                setGeo((p) => ({ ...p, cities: [] }))
                                                fetchCities(country, state)
                                            }}
                                            options={mergedStates.map((s) => ({ value: s, label: s }))}
                                            disabled={!formData.address.country || geoLoading.states}
                                            clearOnBackspace
                                            placeholder={
                                                !formData.address.country
                                                    ? 'Select country first'
                                                    : geoLoading.states
                                                      ? 'Loading states...'
                                                      : 'Select state'
                                            }
                                            searchable
                                            searchPlaceholder="Search state..."
                                            buttonClassName="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white text-left"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900">City</label>
                                        <SearchableSelect
                                            id="profile-city"
                                            name="city"
                                            value={formData.address.city}
                                            onChange={(e) => {
                                                const city = String(e.target.value || '').trim()
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    address: { ...prev.address, city }
                                                }))
                                            }}
                                            options={mergedCities.map((c) => ({ value: c, label: c }))}
                                            disabled={!formData.address.country || !formData.address.state || geoLoading.cities}
                                            clearOnBackspace
                                            placeholder={
                                                !formData.address.country
                                                    ? 'Select country first'
                                                    : !formData.address.state
                                                      ? 'Select state first'
                                                      : geoLoading.cities
                                                        ? 'Loading cities...'
                                                        : 'Select city'
                                            }
                                            searchable
                                            searchPlaceholder="Search city..."
                                            buttonClassName="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white text-left"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900">Zip Code</label>
                                        <input
                                            type="text"
                                            name="zipCode"
                                            value={formData.address.zipCode}
                                            onChange={(e) => {
                                                const v = sanitizePostalDigits(e.target.value)
                                                setFormData(prev => ({
                                                    ...prev,
                                                    address: { ...prev.address, zipCode: v }
                                                }))
                                            }}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                        {formData.address.zipCode && !isValidOptionalPostalDigits(formData.address.zipCode) && (
                                            <p className="mt-1 text-xs font-semibold text-red-600">
                                                {OPTIONAL_POSTAL_DIGITS_MESSAGE}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Professional Info (Agents Only) */}
                        {(user?.role === 'agent' || user?.role === 'agency_admin') && (
                            <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <Briefcase className="h-5 w-5 mr-2 text-primary-600" />
                                    Professional Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900">License Number</label>
                                        <div className="mt-1 flex rounded-md shadow-sm">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                                <Award className="h-4 w-4" />
                                            </span>
                                            <input
                                                type="text"
                                                name="agentInfo.licenseNumber"
                                                value={formData.agentInfo.licenseNumber}
                                                onChange={handleInputChange}
                                                className="flex-1 min-w-0 block w-full border border-gray-300 rounded-none rounded-r-md p-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900">Years of Experience</label>
                                        <input
                                            type="number"
                                            name="agentInfo.yearsOfExperience"
                                            value={formData.agentInfo.yearsOfExperience}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-900 mb-1">
                                            Professional Bio / Description
                                        </label>
                                        <div className="flex rounded-md shadow-sm">
                                            <span className="inline-flex items-start pt-2.5 px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                                <FileText className="h-4 w-4" />
                                            </span>
                                            <textarea
                                                name="agentInfo.bio"
                                                rows={4}
                                                value={formData.agentInfo.bio}
                                                onChange={handleInputChange}
                                                className="flex-1 min-w-0 block w-full border border-gray-300 rounded-none rounded-r-md p-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                                placeholder="Tell clients about your experience, approach, and why they should work with you..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Saving Changes...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5 mr-2" />
                                    Save Profile
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
