'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import ContactAgentSheet from '../../../components/Common/ContactAgentSheet'
import { api } from '../../../lib/api'
import {
    getAgentContactFromInquiry,
    getDisplayAgency,
    getDisplayAgent,
    isMobileContactView,
    openGmailCompose,
    openPhoneCall,
    buildCustomerToAgentEmail
} from '../../../lib/agentContact'
import { getPropertyPrimaryImageUrl } from '../../../lib/propertyImage'
import { resolveMediaUrl } from '../../../lib/mediaUrl'
import {
    MessageSquare,
    Search,
    MapPin,
    Calendar,
    User,
    ExternalLink,
    Clock,
    CheckCircle2,
    Building
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function MyInquiries() {
    const [inquiries, setInquiries] = useState([])
    const [loading, setLoading] = useState(true)
    const [contactingId, setContactingId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [contactSheet, setContactSheet] = useState(null)

    useEffect(() => {
        fetchInquiries()
    }, [])

    const fetchInquiries = async () => {
        try {
            setLoading(true)
            const res = await api.get('/leads/my-inquiries')
            setInquiries(res.data)
        } catch (error) {
            console.error('Error fetching inquiries:', error)
            toast.error('Failed to load inquiries')
        } finally {
            setLoading(false)
        }
    }

    const openContactChannel = (agentContact, inquiry, statusMessage) => {
        const prop = getProperty(inquiry)
        const propertyTitle = prop?.title || 'General Inquiry'
        const propertyLocation = prop?.location
            ? [prop.location.city, prop.location.state].filter(Boolean).join(', ')
            : ''
        const customerName = inquiry.contact
            ? [inquiry.contact.firstName, inquiry.contact.lastName].filter(Boolean).join(' ').trim()
            : ''

        const hasEmail = Boolean(agentContact.email?.trim())
        const hasPhone = Boolean(agentContact.phone?.trim())

        if (!hasEmail && !hasPhone) {
            toast.error('Agent contact details are not available')
            return
        }

        if (hasEmail && hasPhone && isMobileContactView()) {
            setContactSheet({
                agentContact,
                propertyTitle,
                propertyLocation,
                customerName,
                statusMessage
            })
            return
        }

        if (hasEmail) {
            const { subject, bodyLines } = buildCustomerToAgentEmail({
                agentName: agentContact.name,
                propertyTitle,
                propertyLocation,
                customerName
            })
            const result = openGmailCompose({ to: agentContact.email, subject, bodyLines })
            if (!result.ok) toast.error(result.error)
            else if (statusMessage) toast.success(statusMessage, { duration: 3500 })
            return
        }

        if (!isMobileContactView()) {
            toast.error('Calling is only available on mobile. Please use email to contact your agent.')
            return
        }

        const result = openPhoneCall(agentContact.phone)
        if (!result.ok) toast.error(result.error)
        else if (statusMessage) toast.success(statusMessage, { duration: 4000 })
    }

    const handleContactAgent = async (inquiry) => {
        const inquiryId = inquiry._id
        try {
            setContactingId(inquiryId)
            const res = await api.post(`/leads/${inquiryId}/contact-agent`)
            const { message, agentContact: apiContact, emailSent } = res.data || {}
            const agentContact = getAgentContactFromInquiry(inquiry, apiContact)

            if (!agentContact.email && !agentContact.phone) {
                toast.error('No agent contact details available yet')
                return
            }

            const statusMessage = emailSent ? 'Agent notified. Opening your email app…' : undefined

            openContactChannel(agentContact, inquiry, statusMessage)
        } catch (error) {
            console.error('Contact agent error:', error)
            toast.error(error.response?.data?.message || 'Failed to contact agent')
        } finally {
            setContactingId(null)
        }
    }

    const getProperty = (inq) => {
        return inq.property || inq.interestedProperties?.[0]?.property
    }

    const getInquiryUrl = (inq) => {
        const prop = getProperty(inq)
        if (!prop) return '#'
        return `/properties/${prop.slug || prop._id}?from=inquiries`
    }

    const filteredInquiries = inquiries.filter((inq) => {
        const prop = getProperty(inq)
        const agencyName = getDisplayAgency(inq)?.name || ''
        const agentName = [getDisplayAgent(inq)?.firstName, getDisplayAgent(inq)?.lastName]
            .filter(Boolean)
            .join(' ')
        const q = searchTerm.toLowerCase()
        return (
            prop?.title?.toLowerCase().includes(q) ||
            agencyName.toLowerCase().includes(q) ||
            agentName.toLowerCase().includes(q)
        )
    })

    const getStatusStyle = (status) => {
        switch (status) {
            case 'new':
                return 'bg-blue-50 text-blue-700 border-blue-100'
            case 'contacted':
                return 'bg-purple-50 text-purple-700 border-purple-100'
            case 'qualified':
                return 'bg-indigo-50 text-indigo-700 border-indigo-100'
            case 'site_visit_scheduled':
                return 'bg-orange-50 text-orange-700 border-orange-100'
            case 'booked':
                return 'bg-green-50 text-green-700 border-green-100'
            case 'lost':
                return 'bg-red-50 text-red-700 border-red-100'
            default:
                return 'bg-gray-50 text-gray-700 border-gray-100'
        }
    }

    return (
        <DashboardLayout>
            <ContactAgentSheet
                open={Boolean(contactSheet)}
                onClose={() => setContactSheet(null)}
                agentContact={contactSheet?.agentContact}
                propertyTitle={contactSheet?.propertyTitle}
                propertyLocation={contactSheet?.propertyLocation}
                customerName={contactSheet?.customerName}
                statusMessage={contactSheet?.statusMessage}
            />

            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Inquiries</h1>
                        <p className="text-gray-500 text-sm mt-1">Status of all properties you have inquired about.</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search inquiries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-full md:w-64 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-gray-100" />
                        ))}
                    </div>
                ) : filteredInquiries.length > 0 ? (
                    <div className="space-y-4">
                        {filteredInquiries.map((inq) => {
                            const prop = getProperty(inq)
                            const displayAgency = getDisplayAgency(inq)
                            const displayAgent = getDisplayAgent(inq)
                            const imageSrc = getPropertyPrimaryImageUrl(prop?.images)
                            const agentPhoto = displayAgent?.profileImage
                                ? resolveMediaUrl(displayAgent.profileImage)
                                : null

                            return (
                            <div
                                key={inq._inquiryKey || inq._id}
                                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-6"
                            >
                                <Link
                                    href={getInquiryUrl(inq)}
                                    className="w-full md:w-32 h-24 relative rounded-xl overflow-hidden flex-shrink-0 block hover:opacity-90 transition-opacity bg-gray-100"
                                >
                                    <Image
                                        src={imageSrc}
                                        alt={prop?.title || 'Property'}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                        sizes="(max-width: 768px) 100vw, 128px"
                                    />
                                </Link>

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(inq.status)}`}
                                        >
                                            {inq.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            Inquired on{' '}
                                            {new Date(inq.inquiredAt || inq.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <Link href={getInquiryUrl(inq)} className="hover:text-primary-600 transition-colors block">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                                            {prop?.title || 'General Inquiry'}
                                        </h3>
                                    </Link>

                                    <div className="flex items-center text-gray-500 text-xs mb-3">
                                        <MapPin className="h-3 w-3 mr-1 text-primary-500" />
                                        <span className="truncate">
                                            {prop?.location?.city || 'N/A'}, {prop?.location?.state || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                        {displayAgency?.name && (
                                            <div className="flex items-center">
                                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 overflow-hidden">
                                                    {displayAgency.logo ? (
                                                        <Image
                                                            src={resolveMediaUrl(displayAgency.logo)}
                                                            alt=""
                                                            width={24}
                                                            height={24}
                                                            className="object-cover h-full w-full"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <Building className="h-3 w-3 text-gray-500" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {displayAgency.name}
                                                </span>
                                            </div>
                                        )}
                                        {displayAgent && (
                                            <div className="flex items-center">
                                                <div className="h-6 w-6 rounded-full bg-primary-50 flex items-center justify-center mr-2 overflow-hidden">
                                                    {agentPhoto ? (
                                                        <Image
                                                            src={agentPhoto}
                                                            alt=""
                                                            width={24}
                                                            height={24}
                                                            className="object-cover h-full w-full"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <User className="h-3 w-3 text-primary-600" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {displayAgent.firstName} {displayAgent.lastName}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex md:flex-col justify-end md:justify-center gap-2">
                                    {prop && (
                                        <Link
                                            href={`/properties/${prop.slug || prop._id}?from=inquiries`}
                                            className="flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-all text-sm font-bold"
                                        >
                                            View Property <ExternalLink className="h-4 w-4 ml-2" />
                                        </Link>
                                    )}
                                    {displayAgent && (
                                        <button
                                            type="button"
                                            onClick={() => handleContactAgent(inq)}
                                            disabled={contactingId === inq._id}
                                            title="Email in Gmail or call your agent"
                                            className="flex items-center justify-center px-4 py-2 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all text-sm font-bold border border-gray-100 min-w-[120px]"
                                        >
                                            {contactingId === inq._id ? (
                                                <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                'Contact Agent'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="h-10 w-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">No inquiries yet</h2>
                        <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                            Any property you inquire about through our website will appear here for you to track.
                        </p>
                        <Link
                            href="/properties"
                            className="mt-8 inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold shadow-md shadow-primary-200"
                        >
                            Explore Properties
                        </Link>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center mb-4">
                            <div className="p-2 bg-green-100 rounded-lg mr-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 line-clamp-1">What happens after an inquiry?</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Once you submit an inquiry, an agent from the agency will be assigned to help you. They will
                            typically contact you via email or phone within 24-48 hours.
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 line-clamp-1">How can I track progress?</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            The status badge on each inquiry tells you where you are in the process. From &apos;New&apos; to
                            &apos;Site Visit&apos; and finally &apos;Booked&apos;.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
