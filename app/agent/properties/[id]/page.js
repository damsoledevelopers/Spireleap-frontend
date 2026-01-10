'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '../../../../components/Layout/DashboardLayout'
import { useAuth } from '../../../../contexts/AuthContext'
import { api } from '../../../../lib/api'
import {
  ArrowLeft,
  Edit,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Calendar,
  Building,
  User,
  DollarSign,
  Package,
  Eye,
  Users,
  MessageSquare,
  Plus,
  Phone,
  Mail,
  UserCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AgentPropertyViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    fetchProperty()
  }, [params.id, user])

  const fetchProperty = async () => {
    try {
      setLoading(true)
      const [propertyRes, leadsRes] = await Promise.all([
        api.get(`/properties/${params.id}`),
        api.get(`/properties/${params.id}/leads`)
      ])
      setProperty(propertyRes.data.property)
      setLeads(leadsRes.data.leads || [])
    } catch (error) {
      console.error('Error fetching property:', error)
      toast.error('Failed to load property')
      router.push('/agent/properties')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      await api.post(`/properties/${params.id}/notes`, { note: newNote })
      toast.success('Note added successfully')
      setNewNote('')
      fetchProperty()
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/properties/${params.id}/status`, { status: newStatus })
      toast.success('Property status updated successfully')
      fetchProperty()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A'
    if (typeof price === 'object') {
      if (price.sale) return `$${Number(price.sale).toLocaleString()}`
      if (price.rent) return `$${Number(price.rent.amount).toLocaleString()}/${price.rent.period}`
    }
    return `$${Number(price).toLocaleString()}`
  }

  const getImageUrl = (image) => {
    if (typeof image === 'string') return image
    return image?.url || image
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!property) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Property not found</p>
          <Link href="/agent/properties" className="text-primary-600 hover:underline mt-4 inline-block">
            Back to Properties
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  // Check if property belongs to this agent
  const propertyAgentId = property.agent?._id || property.agent?.toString() || property.agent
  const userId = user?.id || user?._id
  if (propertyAgentId !== userId) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">You don't have access to this property</p>
          <Link href="/agent/properties" className="text-primary-600 hover:underline mt-4 inline-block">
            Back to Properties
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const primaryImage = property.images?.find(img => img?.isPrimary) || property.images?.[0]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/agent/properties" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Property Details</h1>
              <p className="mt-1 text-sm text-gray-500">View property information and leads</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/agency/properties/${params.id}/edit`}
              className="btn btn-primary flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Property
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-96 bg-gray-200">
                {primaryImage ? (
                  <img
                    src={getImageUrl(primaryImage)}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h2>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>
                      {property.location?.address && `${property.location.address}, `}
                      {property.location?.city}, {property.location?.state}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={property.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="active">Available</option>
                    <option value="sold">Sold</option>
                    <option value="rented">Rented</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{property.description || 'No description available'}</p>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                {property.specifications?.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bedrooms</p>
                      <p className="font-semibold">{property.specifications.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Bathrooms</p>
                      <p className="font-semibold">{property.specifications.bathrooms}</p>
                    </div>
                  </div>
                )}
                {property.specifications?.area && (
                  <div className="flex items-center gap-2">
                    <Square className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Area</p>
                      <p className="font-semibold">
                        {property.specifications.area.value} {property.specifications.area.unit}
                      </p>
                    </div>
                  </div>
                )}
                {property.specifications?.parking !== undefined && (
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Parking</p>
                      <p className="font-semibold">{property.specifications.parking}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Leads Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Related Leads ({leads.length})
                </h3>
              </div>
              {leads.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No leads for this property yet</p>
              ) : (
                <div className="space-y-4">
                  {leads.map((lead) => (
                    <Link
                      key={lead._id}
                      href={`/agency/leads/${lead._id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {lead.contact?.firstName} {lead.contact?.lastName}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {lead.contact?.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {lead.contact?.phone}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'closed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes
              </h3>
              <div className="space-y-4 mb-4">
                {property.notes && property.notes.length > 0 ? (
                  property.notes.map((note, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-700">{note.note}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {note.createdBy?.firstName} {note.createdBy?.lastName} • {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddNote()
                    }
                  }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Price</h3>
              </div>
              <p className="text-3xl font-bold text-primary-600 mb-2">
                {formatPrice(property.price)}
              </p>
              <p className="text-sm text-gray-500 capitalize">
                {property.listingType === 'sale' ? 'For Sale' : property.listingType === 'rent' ? 'For Rent' : property.listingType}
              </p>
            </div>

            {/* Agency & Agent Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Agency & Agent</h3>
              {property.agency && (
                <div className="mb-4 pb-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Agency</span>
                  </div>
                  <p className="text-gray-700">{property.agency.name || 'N/A'}</p>
                </div>
              )}
              {property.agent && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Agent</span>
                  </div>
                  <p className="text-gray-700">
                    {property.agent.firstName} {property.agent.lastName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

