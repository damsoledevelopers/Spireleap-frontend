'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Building, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'

function display(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  const s = String(v).trim()
  return s || '—'
}

const DEPT_LABELS = {
  accounts: 'Accounts',
  hr: 'HR',
  support: 'Support',
  marketing: 'Marketing',
  other: 'Other'
}

export default function AdminStaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { checkPermission } = useAuth()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const canEditStaff = checkPermission('users', 'edit')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/users/${params.id}`)
        const u = res.data
        if (u.role !== 'staff') {
          toast.error('This user is not a staff member')
          router.push('/admin/staff')
          return
        }
        setMember(u)
      } catch (error) {
        console.error('Error loading staff:', error)
        toast.error('Failed to load staff member')
        router.push('/admin/staff')
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

  if (!member) return null

  const addr = member.address || {}
  const si = member.staffInfo || {}
  const dept = si.department ? DEPT_LABELS[si.department] || si.department : null
  const agencyName =
    typeof member.agency === 'object' && member.agency?.name ? member.agency.name : member.agency ? display(member.agency) : '—'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Link href="/admin/staff" className="text-gray-600 hover:text-gray-900 mt-1 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-4 min-w-0">
              {member.profileImage ? (
                <img src={member.profileImage} alt="" className="h-16 w-16 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-lg">
                    {member.firstName?.charAt(0)}
                    {member.lastName?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {display(`${member.firstName || ''} ${member.lastName || ''}`.trim())}
                </h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{display(member.email)}</span>
                </p>
              </div>
            </div>
          </div>
          {canEditStaff && (
            <Link href={`/admin/staff/${params.id}/edit`} className="btn btn-primary inline-flex items-center gap-2 shrink-0">
              <Edit className="h-4 w-4" />
              Edit staff
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
                  {display(member.phone)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                <dd className="mt-1">
                  {member.isActive ? (
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
            </dl>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-gray-400" />
              Employment
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Department</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(dept)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Position / title</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(si.position)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase">Employee ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{display(si.employeeId)}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 lg:col-span-2">
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
        </div>
      </div>
    </DashboardLayout>
  )
}
