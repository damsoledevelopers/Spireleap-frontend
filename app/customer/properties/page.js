'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { api } from '../../../lib/api'
import {
    Building,
    Search,
    Filter,
    MapPin,
    Bed,
    Bath,
    Square,
    MessageSquare,
    Tag,
    Clock
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function MyProperties() {
    const [activeTab, setActiveTab] = useState('inquired')
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        inquired: [],
        purchased: [],
        rented: [],
        booked: []
    })

    useEffect(() => {
        fetchMyProperties()
    }, [])

    const fetchMyProperties = async () => {
        try {
            setLoading(true)
            const res = await api.get('/properties/my-properties')
            setData(res.data)
        } catch (error) {
            console.error('Error fetching properties:', error)
            toast.error('Failed to load properties')
        } finally {
            setLoading(false)
        }
    }

    const tabs = [
        { id: 'inquired', label: 'Inquiries', icon: MessageSquare },
        { id: 'booked', label: 'Booked', icon: Clock },
        { id: 'purchased', label: 'Purchased', icon: Tag },
        { id: 'rented', label: 'Rented', icon: Clock },
    ]

    const properties = data[activeTab] || []

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
                        <p className="text-gray-500 text-sm mt-1">Properties you've inquired about, purchased, or rented.</p>
                    </div>
                    <Link
                        href="/properties"
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-sm font-medium"
                    >
                        Find More Properties
                    </Link>
                </div>

                {/* Tab Navigation */}
                <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className={`h-4 w-4 mr-2 ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}`} />
                            {tab.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-primary-50 text-primary-600' : 'bg-gray-200 text-gray-500'
                                }`}>
                                {data[tab.id]?.length || 0}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Property Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl h-96 animate-pulse border border-gray-100"></div>
                        ))}
                    </div>
                ) : properties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map((property) => (
                            <div key={property._id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col">
                                {/* Image Section */}
                                <div className="relative h-48 w-full overflow-hidden">
                                    <Image
                                        src={property.images?.[0]?.url || '/property-placeholder.jpg'}
                                        alt={property.title}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${property.listingType === 'sale' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                                            }`}>
                                            For {property.listingType}
                                        </span>
                                    </div>
                                    <div className="absolute top-4 right-4">
                                        <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold shadow-sm">
                                            {property.propertyType}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                                            {property.title}
                                        </h3>
                                    </div>

                                    <div className="flex items-center text-gray-500 text-xs mb-4">
                                        <MapPin className="h-3 w-3 mr-1 text-primary-500" />
                                        <span className="truncate">
                                            {property.location?.city}, {property.location?.state}
                                        </span>
                                    </div>

                                    {/* Specs */}
                                    <div className="grid grid-cols-3 gap-2 py-4 border-y border-gray-50 mb-4">
                                        <div className="flex flex-col items-center">
                                            <Bed className="h-4 w-4 text-gray-400 mb-1" />
                                            <span className="text-xs font-bold text-gray-900">{property.specifications?.bedrooms || 0} Bed</span>
                                        </div>
                                        <div className="flex flex-col items-center border-x border-gray-50">
                                            <Bath className="h-4 w-4 text-gray-400 mb-1" />
                                            <span className="text-xs font-bold text-gray-900">{property.specifications?.bathrooms || 0} Bath</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <Square className="h-4 w-4 text-gray-400 mb-1" />
                                            <span className="text-xs font-bold text-gray-900">{property.specifications?.area?.value || 0} {property.specifications?.area?.unit}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Price</p>
                                            <p className="text-xl font-extrabold text-primary-600">
                                                ${property.listingType === 'sale'
                                                    ? property.price?.sale?.toLocaleString()
                                                    : `${property.price?.rent?.amount?.toLocaleString()}/${property.price?.rent?.period}`}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/properties/${property.slug || property._id}?from=my-properties`}
                                            className="p-2.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-gray-100"
                                        >
                                            <ArrowRight className="h-5 w-5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Building className="h-10 w-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">No properties found</h2>
                        <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                            {activeTab === 'inquired'
                                ? "You haven't inquired about any properties yet."
                                : activeTab === 'booked'
                                    ? "You haven't booked any properties yet."
                                    : activeTab === 'purchased'
                                        ? "You haven't purchased any properties yet."
                                        : "You haven't rented any properties yet."}
                        </p>
                        <Link
                            href="/properties"
                            className="mt-8 inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold shadow-md shadow-primary-200"
                        >
                            Start Searching
                        </Link>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

const ArrowRight = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
)
