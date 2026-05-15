'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Edit, Building, Mail, Phone, MapPin, Globe, User } from 'lucide-react'
import toast from 'react-hot-toast'

function display(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  const s = String(v).trim()
  return s || '—'
}

export default function AdminAgencyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { checkPermission } = useAuth()
  const [agency, setAgency] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const canEditAgency = checkPermission('agencies', 'edit')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [agRes, stRes] = await Promise.all([
          api.get(`/agencies/${params.id}`),
          api.get(`/agencies/${params.id}/stats`).catch(() => ({ data: {} }))
        ])
        setAgency(agRes.data?.agency || null)
        setStats(stRes.data?.stats || null)
      } catch (error) {
        console.error('Error loading agency:', error)
        toast.error('Failed to load agency')
        router.push('/admin/agencies')
      } finally {
        setLoading(false)
      }
    }
    if (params.id) load()
  }, [params.id, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!agency) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Agency not found</p>
          <Link href="/admin/agencies" className="text-primary-600 hover:underline mt-4 inline-block">
            Back to agencies
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const addr = agency.contact?.address || {}
  const owner = agency.owner

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Link href="/admin/agencies" className="text-gray-600 hover:text-gray-900 mt-1 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-4 min-w-0">
              {agency.logo ? (
                <img src={agency.logo} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0">
                  <Building className="h-8 w-8 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 break-words">{display(agency.name)}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {agency.slug ? `/${agency.slug}` : 'Agency profile'}
                </p>
              </div>
            </div>
          </div>
          {canEditAgency && (
            <Link href={`/admin/agencies/${params.id}/edit`} className="btn btn-primary inline-flex items-center gap-2 shrink-0">
              <Edit className="h-4 w-4" />
              Edit agency
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap break-words">{display(agency.description)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                <dd className="mt-1">
                  {agency.isActive ? (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Slug</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(agency.slug)}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-gray-400" />
              Contact
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 break-all">{display(agency.contact?.email)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{display(agency.contact?.phone)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> Website
                </dt>
                <dd className="mt-1 text-sm">
                  {agency.contact?.website ? (
                    <a
                      href={String(agency.contact.website).startsWith('http') ? agency.contact.website : `https://${agency.contact.website}`}
                      className="text-primary-600 hover:underline break-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {agency.contact.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              Address
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase">Street</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(addr.street)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">City</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(addr.city)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">State</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(addr.state)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Country</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(addr.country)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">ZIP / Postal</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(addr.zipCode ?? addr.zip)}</dd>
              </div>
            </dl>
          </section>

          {owner && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                Agency admin (owner)
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {display(`${owner.firstName || ''} ${owner.lastName || ''}`.trim())}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">{display(owner.email)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{display(owner.phone)}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                ['Agents', stats?.totalAgents ?? agency.stats?.totalAgents],
                ['Properties', stats?.totalProperties ?? agency.stats?.totalProperties],
                ['Active properties', stats?.activeProperties ?? agency.stats?.activeProperties],
                ['Sold', stats?.soldProperties],
                ['Rented', stats?.rentedProperties],
                ['Leads', stats?.totalLeads ?? agency.stats?.totalLeads],
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{val != null ? val : '—'}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-gray-400 mt-4">
              Created {agency.createdAt ? new Date(agency.createdAt).toLocaleString('en-GB') : '—'}
              {agency.updatedAt && ` · Updated ${new Date(agency.updatedAt).toLocaleString('en-GB')}`}
            </p>
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
