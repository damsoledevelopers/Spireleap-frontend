'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Building, User } from 'lucide-react'
import toast from 'react-hot-toast'

function display(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  const s = String(v).trim()
  return s || '—'
}

function listDisplay(arr) {
  if (!Array.isArray(arr) || !arr.length) return '—'
  return arr.map((x) => String(x).trim()).filter(Boolean).join(', ') || '—'
}

export default function AdminAgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { checkPermission } = useAuth()
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const canEditAgent = checkPermission('users', 'edit')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/users/${params.id}`)
        const u = res.data
        if (u.role !== 'agent') {
          toast.error('This user is not an agent')
          router.push('/admin/agents')
          return
        }
        setAgent(u)
      } catch (error) {
        console.error('Error loading agent:', error)
        toast.error('Failed to load agent')
        router.push('/admin/agents')
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

  if (!agent) return null

  const addr = agent.address || {}
  const ai = agent.agentInfo || {}
  const agencyName = typeof agent.agency === 'object' && agent.agency?.name ? agent.agency.name : display(agent.agency)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Link href="/admin/agents" className="text-gray-600 hover:text-gray-900 mt-1 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-4 min-w-0">
              {agent.profileImage ? (
                <img src={agent.profileImage} alt="" className="h-16 w-16 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-lg">
                    {agent.firstName?.charAt(0)}
                    {agent.lastName?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {display(`${agent.firstName || ''} ${agent.lastName || ''}`.trim())}
                </h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{display(agent.email)}</span>
                </p>
              </div>
            </div>
          </div>
          {canEditAgent && (
            <Link href={`/admin/agents/${params.id}/edit`} className="btn btn-primary inline-flex items-center gap-2 shrink-0">
              <Edit className="h-4 w-4" />
              Edit agent
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-1">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  {display(agent.phone)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                <dd className="mt-1">
                  {agent.isActive ? (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" /> Agency
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{agencyName}</dd>
              </div>
              {agent.company && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900">{display(agent.company)}</dd>
                </div>
              )}
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

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              Professional
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">License number</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(ai.licenseNumber)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Years of experience</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(ai.yearsOfExperience)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Commission rate</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ai.commissionRate !== undefined && ai.commissionRate !== null && String(ai.commissionRate).trim() !== ''
                    ? `${ai.commissionRate}%`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Specialties</dt>
                <dd className="mt-1 text-sm text-gray-900">{listDisplay(ai.specialties)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Languages</dt>
                <dd className="mt-1 text-sm text-gray-900">{listDisplay(ai.languages)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase">Bio</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap break-words">{display(ai.bio)}</dd>
              </div>
            </dl>            
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
