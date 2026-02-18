import Link from 'next/link'
import {
  Building,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Briefcase,
  User,
  Home,
  ArrowRight,
  XCircle,
  Plus
} from 'lucide-react'

// Reusable overview section for Lead detail pages
// Pure presentational component – all data & handlers come via props
export default function LeadDetailOverview({
  lead,
  canEditLead,
  newTag,
  onNewTagChange,
  onAddTag,
  onRemoveTag
}) {
  if (!lead) return null

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (onAddTag) {
        onAddTag()
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Lead ID', value: lead.leadId || `LEAD-${String(lead._id).slice(-6)}`, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Source', value: lead.source || 'N/A', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Campaign', value: lead.campaignName || 'N/A', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Created', value: new Date(lead.createdAt).toLocaleDateString(), icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' }
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase">{stat.label}</p>
              <div className={`p-1.5 ${stat.bg} ${stat.color} rounded-lg`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900 truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Additional Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lead Intelligence */}
        {(lead.score !== undefined || lead.sla) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <div className="p-1.5 bg-red-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-red-600" />
              </div>
              Intelligence
            </h3>
            <div className="space-y-5">
              {lead.score !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Lead Health Score</span>
                    <span
                      className={`text-xl font-semibold ${
                        lead.score >= 70
                          ? 'text-green-600'
                          : lead.score >= 40
                          ? 'text-orange-500'
                          : 'text-red-500'
                      }`}
                    >
                      {lead.score}
                      <span className="text-sm text-gray-400 font-normal">/100</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        lead.score >= 70
                          ? 'bg-green-500'
                          : lead.score >= 40
                          ? 'bg-orange-500'
                          : lead.score >= 20
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${lead.score}%` }}
                    />
                  </div>
                </div>
              )}
              {lead.sla && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">SLA Performance</span>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium uppercase rounded-full ${
                        lead.sla.firstContactStatus === 'breached'
                          ? 'bg-red-100 text-red-700'
                          : lead.sla.firstContactStatus === 'met'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {lead.sla.firstContactStatus || 'Pending'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignment & Property */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <Briefcase className="h-4 w-4 text-indigo-600" />
            </div>
            Assignment
          </h3>
          <div className="space-y-3">
            {[
              {
                label: 'Assigned Agent',
                value: lead.assignedAgent
                  ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}`
                  : 'Unassigned',
                icon: User
              },
              {
                label: 'Agency',
                value: lead.agency && typeof lead.agency === 'object' ? lead.agency.name : 'Independent',
                icon: Building
              }
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
            {lead.property && (
              <div className="flex items-center justify-between p-3 bg-[#700E08]/5 rounded-lg border border-[#700E08]/10 group">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-[#700E08]" />
                  <span className="text-sm font-medium text-[#700E08]/70">Property</span>
                </div>
                <Link
                  href={`/properties/${lead.property.slug || String(lead.property._id)}`}
                  className="text-sm font-semibold text-[#700E08] hover:underline flex items-center gap-1"
                >
                  {lead.property.title}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="p-1.5 bg-[#700E08]/10 rounded-lg">
              <Target className="h-4 w-4 text-[#700E08]" />
            </div>
            Lead Tags
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {lead.tags && lead.tags.length > 0 ? (
            lead.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-white hover:border-[#700E08]/20 transition-colors cursor-default"
              >
                {tag}
                {canEditLead && (
                  <button
                    type="button"
                    onClick={() => onRemoveTag && onRemoveTag(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ))
          ) : (
            <div className="w-full py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm font-medium text-gray-400">No tags categorized</p>
            </div>
          )}
        </div>
        {canEditLead && (
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newTag}
              onChange={(e) => onNewTagChange && onNewTagChange(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type a new tag..."
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#700E08]/20 focus:border-transparent transition-all placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => onAddTag && onAddTag()}
              className="px-4 py-2 bg-[#700E08] text-white rounded-lg hover:bg-[#5a0b06] transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

