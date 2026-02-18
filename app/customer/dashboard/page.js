'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../contexts/AuthContext'
import { api } from '../../../lib/api'
import {
    Building,
    MessageSquare,
    FileText,
    Heart,
    Clock,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CustomerDashboard() {
    const { user, loading: authLoading } = useAuth()
    const [stats, setStats] = useState({
        totalInquiries: 0,
        purchasedProperties: 0,
        rentedProperties: 0,
        bookedProperties: 0,
        watchlistCount: 0,
        recentActivity: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user && !authLoading) {
            fetchDashboardData()
        }
    }, [user, authLoading])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            const res = await api.get('/stats/customer')
            setStats(res.data)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
            toast.error('Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }

    if (loading || authLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading your portal...</p>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    const statCards = [
        { name: 'Purchased Properties', value: stats.purchasedProperties, icon: Building, color: 'text-blue-600', bg: 'bg-blue-100', href: '/customer/properties?tab=purchased' },
        { name: 'Rented Properties', value: stats.rentedProperties, icon: Building, color: 'text-green-600', bg: 'bg-green-100', href: '/customer/properties?tab=rented' },
        { name: 'Booked Properties', value: stats.bookedProperties, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', href: '/customer/properties?tab=booked' },
        { name: 'Active Inquiries', value: stats.totalInquiries, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100', href: '/customer/inquiries' },
    ]

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Welcome Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Welcome back, {user?.firstName}! 👋
                        </h1>
                        <p className="mt-2 text-gray-500 max-w-2xl">
                            Manage your property inquiries, view your purchased and rented properties, and keep track of your invoices all in one place.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/properties"
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 transition-all transform hover:scale-105"
                            >
                                Explore Properties
                            </Link>
                            <Link
                                href="/customer/invoices"
                                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all"
                            >
                                View Invoices <FileText className="ml-2 h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 bg-primary-50 rounded-full blur-3xl opacity-50"></div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {statCards.map((stat) => (
                        <Link key={stat.name} href={stat.href} className="group flex flex-col bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <span className="text-sm font-medium text-gray-400 group-hover:text-primary-600 transition-colors flex items-center">
                                    View <ArrowRight className="ml-1 h-3 w-3" />
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                            <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {stats.recentActivity && stats.recentActivity.length > 0 ? (
                                stats.recentActivity.map((activity, idx) => (
                                    <div key={idx} className="p-6 flex items-start space-x-4 hover:bg-gray-50 transition-colors">
                                        <div className={`mt-1 p-2 rounded-lg ${activity.type === 'inquiry' ? 'bg-purple-100' : 'bg-green-100'}`}>
                                            {activity.type === 'inquiry' ? (
                                                <MessageSquare className="h-4 w-4 text-purple-600" />
                                            ) : (
                                                <FileText className="h-4 w-4 text-green-600" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                                            <div className="mt-1 flex items-center space-x-3">
                                                <span className="text-xs text-gray-500">
                                                    {new Date(activity.time).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activity.status === 'completed' || activity.status === 'closed' ? 'bg-green-100 text-green-700' :
                                                    activity.status === 'pending' || activity.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1).replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        {activity.amount && (
                                            <div className="text-right text-sm font-bold text-gray-900">
                                                ${activity.amount.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="text-gray-500">No recent activity to show.</p>
                                    <Link href="/properties" className="mt-2 text-primary-600 font-medium hover:underline text-sm">
                                        Find your dream property
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Support / Contact */}
                    <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-lg p-8 text-white">
                        <h2 className="text-xl font-bold mb-4">Need Assistance?</h2>
                        <p className="text-primary-100 mb-8 text-sm leading-relaxed">
                            Our dedicated support team and real estate agents are here to help you throughout your journey.
                        </p>
                        <div className="space-y-4">
                            <Link
                                href="/contact"
                                className="block w-full text-center py-3 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-colors shadow-sm"
                            >
                                Contact Support
                            </Link>
                            <Link
                                href="/services"
                                className="block w-full text-center py-3 bg-primary-700/50 text-white font-semibold rounded-xl hover:bg-primary-700/70 transition-colors border border-primary-500/30"
                            >
                                View Services
                            </Link>
                        </div>

                        <div className="mt-12 pt-8 border-t border-primary-500/30">
                            <div className="flex items-center mb-4">
                                <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                                    <span className="font-bold">?</span>
                                </div>
                                <h3 className="font-semibold text-lg">Quick Guide</h3>
                            </div>
                            <ul className="space-y-3 text-sm text-primary-100">
                                <li className="flex items-center">
                                    <div className="h-1.5 w-1.5 bg-primary-300 rounded-full mr-2"></div>
                                    Track your property status
                                </li>
                                <li className="flex items-center">
                                    <div className="h-1.5 w-1.5 bg-primary-300 rounded-full mr-2"></div>
                                    Download invoices & receipts
                                </li>
                                <li className="flex items-center">
                                    <div className="h-1.5 w-1.5 bg-primary-300 rounded-full mr-2"></div>
                                    Manage your wishlist
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
