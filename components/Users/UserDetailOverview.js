import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Activity,
  MessageSquare,
  DollarSign,
  Building,
  CheckCircle,
  XCircle
} from 'lucide-react'

// Reusable overview section for User detail pages
// Pure presentational component – all data comes via props
export default function UserDetailOverview({
  user,
  userInquiries,
  transactions
}) {
  if (!user) return null

  const totalInquiries = userInquiries?.length || 0
  const completedInquiries = userInquiries?.filter(i => i.status === 'booked' || i.status === 'closed').length || 0
  const totalTransactions = transactions?.length || 0
  const completedTransactions = transactions?.filter(t => t.status === 'completed').length || 0

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'User ID', 
            value: `USER-${String(user._id || user.id).slice(-6)}`, 
            icon: User, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50' 
          },
          { 
            label: 'Email', 
            value: user.email || 'N/A', 
            icon: Mail, 
            color: 'text-purple-600', 
            bg: 'bg-purple-50' 
          },
          { 
            label: 'Phone', 
            value: user.phone || 'N/A', 
            icon: Phone, 
            color: 'text-orange-600', 
            bg: 'bg-orange-50' 
          },
          { 
            label: 'Registered', 
            value: user.createdAt || user.created_at 
              ? new Date(user.createdAt || user.created_at).toLocaleDateString() 
              : 'N/A', 
            icon: Calendar, 
            color: 'text-green-600', 
            bg: 'bg-green-50' 
          }
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
        {/* User Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <div className="p-1.5 bg-red-50 rounded-lg">
              <Activity className="h-4 w-4 text-red-600" />
            </div>
            Activity Summary
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Inquiries</span>
                <span className="text-xl font-semibold text-gray-900">
                  {totalInquiries}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-1000 bg-blue-500"
                  style={{ width: `${totalInquiries > 0 ? Math.min((completedInquiries / totalInquiries) * 100, 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {completedInquiries} completed
              </p>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white rounded-lg">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Total Transactions</span>
                </div>
                <span className="px-3 py-1 text-xs font-medium uppercase rounded-full bg-blue-100 text-blue-700">
                  {totalTransactions}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            User Information
          </h3>
          <div className="space-y-3">
            {[
              {
                label: 'Status',
                value: user.isActive ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Inactive
                  </span>
                ),
                icon: Activity
              },
              {
                label: 'Role',
                value: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User',
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
            {user.address && (user.address.street || user.address.city) && (
              <div className="flex items-start justify-between p-3 bg-[#700E08]/5 rounded-lg border border-[#700E08]/10">
                <div className="flex items-start gap-2 flex-1">
                  <MapPin className="h-4 w-4 text-[#700E08] mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[#700E08]/70 block mb-1">Address</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {[
                        user.address.street,
                        user.address.city,
                        user.address.state,
                        user.address.zipCode
                      ].filter(Boolean).join(', ')}
                      {user.address.country && `, ${user.address.country}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <div className="p-1.5 bg-[#700E08]/10 rounded-lg">
              <MessageSquare className="h-4 w-4 text-[#700E08]" />
            </div>
            Engagement Summary
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{totalInquiries}</div>
            <div className="text-sm text-gray-500 mt-1">Total Inquiries</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{completedInquiries}</div>
            <div className="text-sm text-gray-500 mt-1">Completed</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{totalTransactions}</div>
            <div className="text-sm text-gray-500 mt-1">Transactions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">{completedTransactions}</div>
            <div className="text-sm text-gray-500 mt-1">Completed Txns</div>
          </div>
        </div>
      </div>
    </div>
  )
}

