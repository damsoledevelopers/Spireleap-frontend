'use client'

import { useState, useEffect } from 'react'
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

export default function ProfilePage() {
    const { user, fetchUser } = useAuth()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
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
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
                address: {
                    street: user.address?.street || '',
                    city: user.address?.city || '',
                    state: user.address?.state || '',
                    country: user.address?.country || '',
                    zipCode: user.address?.zipCode || ''
                },
                profileImage: user.profileImage || '',
                agentInfo: {
                    bio: user.agentInfo?.bio || '',
                    licenseNumber: user.agentInfo?.licenseNumber || '',
                    specialties: user.agentInfo?.specialties || [],
                    languages: user.agentInfo?.languages || [],
                    yearsOfExperience: user.agentInfo?.yearsOfExperience || 0
                }
            })
            setLoading(false)
        }
    }, [user])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        if (name.includes('.')) {
            const [parent, child] = name.split('.')
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }))
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
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
        const file = e.target.files?.[0]
        if (!file) return

        const formDataUpload = new FormData()
        formDataUpload.append('image', file)

        try {
            setUploading(true)
            const response = await api.post('/upload/profile-image', formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            const imageUrl = response.data.file.url
            setFormData(prev => ({
                ...prev,
                profileImage: imageUrl
            }))
            toast.success('Profile image uploaded successfully')
        } catch (error) {
            console.error('Error uploading image:', error)
            toast.error('Failed to upload image')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            await api.put(`/users/${user._id}`, formData)
            toast.success('Profile updated successfully')
            await fetchUser() // Refresh user context
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error(error.response?.data?.message || 'Failed to update profile')
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
                            <div className="md:flex md:items-center md:space-x-5">
                                <div className="relative flex-shrink-0">
                                    <div className="h-32 w-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                                        {formData.profileImage ? (
                                            <img
                                                src={formData.profileImage}
                                                alt="Profile"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <User className="h-16 w-16 text-gray-400" />
                                            </div>
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-2 cursor-pointer shadow-md hover:bg-primary-700 transition-colors">
                                        <Camera className="h-5 w-5 text-white" />
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                                <div className="mt-4 md:mt-0 text-center md:text-left">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {formData.firstName} {formData.lastName}
                                    </h3>
                                    <p className="text-sm font-medium text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Member since {new Date(user?.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
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
                                    <label className="block text-sm font-medium text-gray-700">First Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
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
                                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
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
                                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                            <Phone className="h-4 w-4" />
                                        </span>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="flex-1 min-w-0 block w-full border border-gray-300 rounded-none rounded-r-md p-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
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
                                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
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
                                        <label className="block text-sm font-medium text-gray-700">City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.address.city}
                                            onChange={handleAddressChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">State</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.address.state}
                                            onChange={handleAddressChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Zip Code</label>
                                        <input
                                            type="text"
                                            name="zipCode"
                                            value={formData.address.zipCode}
                                            onChange={handleAddressChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Country</label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={formData.address.country}
                                            onChange={handleAddressChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
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
                                        <label className="block text-sm font-medium text-gray-700">License Number</label>
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
                                        <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                                        <input
                                            type="number"
                                            name="agentInfo.yearsOfExperience"
                                            value={formData.agentInfo.yearsOfExperience}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
