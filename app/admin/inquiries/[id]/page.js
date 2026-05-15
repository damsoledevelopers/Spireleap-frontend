'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { getAddressLabeledRows } from '../../../../lib/formatAddress'
import { checkEntryPermission } from '../../../../lib/permissions'
import {
  ArrowLeft,
  Edit,
  UserCircle,
  Mail,
  Phone,
  Home,
  Building,
  FileText,
  ExternalLink,
  Calendar,
  Target,
  MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatInquiryPropertyPrice(price) {
  if (price === null || price === undefined) return 'N/A'
  const toUsd = (value) => {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? `$${numeric.toLocaleString()}` : null
  }
  if (typeof price === 'object' && !Array.isArray(price)) {
    if (price.sale !== undefined && price.sale !== null && price.sale !== '') {
      return toUsd(price.sale) || 'N/A'
    }
    if (price.rent?.amount !== undefined && price.rent?.amount !== null && price.rent?.amount !== '') {
      const rentAmount = toUsd(price.rent.amount)
      return rentAmount ? `${rentAmount}/${price.rent.period || 'monthly'}` : 'N/A'
    }
    return 'N/A'
  }
  if (typeof price === 'number') return toUsd(price) || 'N/A'
  if (typeof price === 'string' && price.trim() !== '') {
    const n = Number(price)
    return Number.isFinite(n) ? (toUsd(n) || 'N/A') : price
  }
  return 'N/A'
}

function getStatusBadge(status) {
  const statusStyles = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-purple-100 text-purple-800',
    site_visit_scheduled: 'bg-indigo-100 text-indigo-800',
    site_visit_completed: 'bg-cyan-100 text-cyan-800',
    negotiation: 'bg-orange-100 text-orange-800',
    booked: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
    closed: 'bg-gray-100 text-gray-800',
    junk: 'bg-gray-100 text-gray-800'
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A'}
    </span>
  )
}

function getPriorityBadge(priority) {
  const priorityStyles = {
    Hot: 'bg-red-100 text-red-800',
    Warm: 'bg-orange-100 text-orange-800',
    Cold: 'bg-blue-100 text-blue-800',
    Not_interested: 'bg-gray-100 text-gray-800'
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityStyles[priority] || 'bg-gray-100 text-gray-800'}`}>
      {priority?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A'}
    </span>
  )
}

function disp(v) {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s || '—'
}

export default function AdminInquiryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading, checkPermission } = useAuth()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)

  const canViewInquiries = checkPermission('inquiries', 'view')
  const canEditInquiry = checkPermission('leads', 'edit')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    if (!canViewInquiries) {
      setLoading(false)
      toast.error('You do not have permission to view inquiries')
      router.push('/admin/inquiries')
      return
    }
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/leads/${params.id}`)
        const l = res.data.lead
        if (!checkEntryPermission(l, user, 'view', canViewInquiries)) {
          toast.error('You do not have permission to view this inquiry')
          router.push('/admin/inquiries')
          return
        }
        setLead(l)
      } catch (error) {
        console.error('Failed to load inquiry:', error)
        toast.error('Failed to load inquiry')
        router.push('/admin/inquiries')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, user, authLoading, canViewInquiries, router])

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!lead) return null

  const inq = lead.inquiry || {}
  const contactAddr = lead.contact?.address

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/admin/inquiries" className="text-gray-600 hover:text-gray-900 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {`${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}`.trim() || 'Inquiry'}
              </h1>
              <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {lead.leadId && <span>ID: {lead.leadId}</span>}
                {lead.property?.title && (
                  <span className="flex items-center gap-1 min-w-0">
                    <Home className="h-4 w-4 shrink-0" />
                    <span className="truncate">{lead.property.title}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          {canEditInquiry && (
            <Link href={`/admin/leads/${params.id}/edit`} className="btn btn-primary inline-flex items-center gap-2 shrink-0">
              <Edit className="h-4 w-4" />
              Edit inquiry
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-gray-400" />
              Contact
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {disp(`${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}`.trim())}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900 break-all">{disp(lead.contact?.email)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{disp(lead.contact?.phone)}</dd>
              </div>
              {lead.contact?.alternatePhone && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Alternate phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{disp(lead.contact.alternatePhone)}</dd>
                </div>
              )}
              {lead.contact?.preferredContact && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Preferred contact</dt>
                  <dd className="mt-1 text-sm text-gray-900">{disp(lead.contact.preferredContact)}</dd>
                </div>
              )}
              {contactAddr && getAddressLabeledRows(contactAddr).length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 uppercase mb-2">Address</dt>
                  <dd>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {getAddressLabeledRows(contactAddr).map(({ label, value }) => (
                        <div key={label}>
                          <dt className="text-xs text-gray-500">{label}</dt>
                          <dd className="font-medium text-gray-900 whitespace-pre-line break-words">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-gray-400" />
              Inquiry & pipeline
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                <dd className="mt-1">{getStatusBadge(lead.status)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Priority</dt>
                <dd className="mt-1">{getPriorityBadge(lead.priority)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Source</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lead.source && typeof lead.source === 'string'
                    ? lead.source.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Campaign</dt>
                <dd className="mt-1 text-sm text-gray-900">{disp(lead.campaignName)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Score</dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.score != null ? String(lead.score) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Follow-up
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lead.followUpDate ? new Date(lead.followUpDate).toLocaleString('en-GB') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-GB') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Last updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString('en-GB') : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              Inquiry form details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inq.message && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Message</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap break-words">{inq.message}</dd>
                </div>
              )}
              {(inq.budget?.min != null && inq.budget?.min !== '') && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Budget min</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {inq.budget.currency || '$'}{' '}
                    {typeof inq.budget.min === 'number' ? inq.budget.min.toLocaleString() : String(inq.budget.min)}
                  </dd>
                </div>
              )}
              {(inq.budget?.max != null && inq.budget?.max !== '') && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Budget max</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {inq.budget.currency || '$'}{' '}
                    {typeof inq.budget.max === 'number' ? inq.budget.max.toLocaleString() : String(inq.budget.max)}
                  </dd>
                </div>
              )}
              {inq.timeline && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Timeline</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {typeof inq.timeline === 'string'
                      ? inq.timeline.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                      : String(inq.timeline)}
                  </dd>
                </div>
              )}
              {Array.isArray(inq.propertyType) && inq.propertyType.length > 0 && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Property types</dt>
                  <dd className="mt-1 text-sm text-gray-900">{inq.propertyType.join(', ')}</dd>
                </div>
              )}
            </dl>
          </section>

          {lead.property && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="h-5 w-5 text-gray-400" />
                Main property
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Title</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{disp(lead.property.title)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Price</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatInquiryPropertyPrice(lead.property.price)}</dd>
                </div>
                {lead.property.location && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-gray-500 uppercase">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {typeof lead.property.location === 'string'
                        ? lead.property.location
                        : typeof lead.property.location === 'object'
                          ? [
                              lead.property.location?.address,
                              lead.property.location?.city,
                              lead.property.location?.state,
                              lead.property.location?.country,
                              lead.property.location?.zipCode
                            ]
                              .filter(Boolean)
                              .join(', ') || '—'
                          : '—'}
                    </dd>
                  </div>
                )}
                {lead.property.slug && (
                  <div className="sm:col-span-2">
                    <Link
                      href={`/properties/${lead.property.slug}`}
                      target="_blank"
                      className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1 text-sm"
                    >
                      View public listing <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </dl>
            </section>
          )}

          {Array.isArray(lead.interestedProperties) && lead.interestedProperties.length > 0 && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                Other interested properties
              </h2>
              <ul className="space-y-3">
                {lead.interestedProperties.map((ip, idx) => {
                  const p = ip.property
                  const id = p?._id || p || idx
                  return (
                    <li key={id} className="text-sm border border-gray-100 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{p?.title || 'Property'}</p>
                      {p?.price != null && (
                        <p className="text-gray-600 mt-1">{formatInquiryPropertyPrice(p.price)}</p>
                      )}
                      {p?.slug && (
                        <Link
                          href={`/properties/${p.slug}`}
                          target="_blank"
                          className="text-primary-600 text-xs inline-flex items-center gap-1 mt-2"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {lead.agency && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-gray-400" />
                Agency
              </h2>
              <div className="flex items-center gap-4">
                {lead.agency.logo ? (
                  <img src={lead.agency.logo} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <Building className="h-14 w-14 text-gray-300" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{disp(lead.agency.name)}</p>
                  {lead.agency.contact?.email && (
                    <p className="text-sm text-gray-500">{lead.agency.contact.email}</p>
                  )}
                  {lead.agency.contact?.phone && (
                    <p className="text-sm text-gray-500">{lead.agency.contact.phone}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-gray-400" />
              Assigned agent
            </h2>
            {lead.assignedAgent ? (
              <div className="flex items-center gap-4">
                {lead.assignedAgent.profileImage ? (
                  <img
                    src={lead.assignedAgent.profileImage}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-14 w-14 text-gray-300" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {`${lead.assignedAgent.firstName || ''} ${lead.assignedAgent.lastName || ''}`.trim() || '—'}
                  </p>
                  {lead.assignedAgent.email && <p className="text-sm text-gray-500">{lead.assignedAgent.email}</p>}
                  {lead.assignedAgent.phone && <p className="text-sm text-gray-500">{lead.assignedAgent.phone}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No agent assigned</p>
            )}
          </section>

          {(lead.assignedBy || lead.reportingManager) && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Internal</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lead.assignedBy && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Assigned by</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {disp(`${lead.assignedBy.firstName || ''} ${lead.assignedBy.lastName || ''}`.trim())}
                    </dd>
                  </div>
                )}
                {lead.reportingManager && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Reporting manager</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {disp(`${lead.reportingManager.firstName || ''} ${lead.reportingManager.lastName || ''}`.trim())}
                      {lead.reportingManager.email && (
                        <span className="block text-gray-500 text-xs mt-0.5">{lead.reportingManager.email}</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
