'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { api } from '../../../lib/api'
import {
    Heart,
    Trash2,
    MapPin,
    ExternalLink,
    Bed,
    Bath,
    Square,
    Building
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function MyWishlist() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchWishlist()
    }, [])

    const fetchWishlist = async () => {
        try {
            setLoading(true)
            const res = await api.get('/watchlist')
            setItems(res.data.watchlist || [])
        } catch (error) {
            console.error('Error fetching wishlist:', error)
            toast.error('Failed to load wishlist')
        } finally {
            setLoading(false)
        }
    }

    const handleRemove = async (id) => {
        try {
            await api.delete(`/watchlist/${id}`)
            setItems(items.filter(item => item._id !== id))
            toast.success('Removed from wishlist')
        } catch (error) {
            console.error('Error removing item:', error)
            toast.error('Failed to remove item')
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
                    <p className="text-gray-500 text-sm mt-1">Properties you've saved to view later.</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100"></div>
                        ))}
                    </div>
                ) : items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((item) => {
                            const property = item.property
                            if (!property) return null

                            return (
                                <div key={item._id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col">
                                    {/* Image Section */}
                                    <div className="relative h-48 w-full overflow-hidden">
                                        <Image
                                            src={property.images?.[0]?.url || '/property-placeholder.jpg'}
                                            alt={property.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <button
                                            onClick={() => handleRemove(item._id)}
                                            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            title="Remove from wishlist"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <div className="absolute top-4 left-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${property.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                                                }`}>
                                                {property.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">
                                            {property.title}
                                        </h3>

                                        <div className="flex items-center text-gray-500 text-xs mb-4">
                                            <MapPin className="h-3 w-3 mr-1 text-primary-500" />
                                            <span className="truncate">
                                                {property.location?.city}, {property.location?.state}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 py-4 border-y border-gray-50 mb-4">
                                            <div className="flex flex-col items-center">
                                                <Bed className="h-4 w-4 text-gray-400 mb-1" />
                                                <span className="text-xs font-bold text-gray-900">{property.specifications?.bedrooms || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center border-x border-gray-50">
                                                <Bath className="h-4 w-4 text-gray-400 mb-1" />
                                                <span className="text-xs font-bold text-gray-900">{property.specifications?.bathrooms || 0}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <Square className="h-4 w-4 text-gray-400 mb-1" />
                                                <span className="text-xs font-bold text-gray-900">{property.specifications?.area?.value || 0}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex items-center justify-between">
                                            <p className="text-lg font-extrabold text-primary-600">
                                                ${property.price?.sale?.toLocaleString() || property.price?.rent?.amount?.toLocaleString()}
                                            </p>
                                            <Link
                                                href={`/properties/${property.slug || property._id}?from=wishlist`}
                                                className="p-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="h-10 w-10 text-gray-200" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Your wishlist is empty</h2>
                        <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                            Save properties you like so you can easily find them later and compare.
                        </p>
                        <Link
                            href="/properties"
                            className="mt-8 inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold shadow-md shadow-primary-200"
                        >
                            Start Exploring
                        </Link>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
