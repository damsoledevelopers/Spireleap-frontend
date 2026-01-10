'use client'

import { Trophy, Medal, Award, TrendingUp, Users, Target } from 'lucide-react'

export default function AgentLeaderboard({ agents = [], period = '30d' }) {
  const sortedAgents = [...agents]
    .sort((a, b) => {
      // Sort by conversion rate first, then by total leads
      if (b.conversionRate !== a.conversionRate) {
        return (b.conversionRate || 0) - (a.conversionRate || 0)
      }
      return (b.totalLeads || 0) - (a.totalLeads || 0)
    })
    .slice(0, 10)

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />
      default:
        return <span className="text-lg font-bold text-gray-400">#{rank}</span>
    }
  }

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 3:
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top 3 Podium */}
      {sortedAgents.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="text-center">
            <div className="bg-gray-100 rounded-lg p-4 border-2 border-gray-300">
              <Medal className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">
                {sortedAgents[1]?.firstName} {sortedAgents[1]?.lastName}
              </p>
              <p className="text-xs text-gray-500">{sortedAgents[1]?.conversionRate || 0}% Conversion</p>
              <p className="text-lg font-bold text-gray-700 mt-2">{sortedAgents[1]?.totalLeads || 0} Leads</p>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-400">2</div>
          </div>

          {/* 1st Place */}
          <div className="text-center">
            <div className="bg-yellow-100 rounded-lg p-4 border-2 border-yellow-400">
              <Trophy className="h-10 w-10 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">
                {sortedAgents[0]?.firstName} {sortedAgents[0]?.lastName}
              </p>
              <p className="text-xs text-gray-500">{sortedAgents[0]?.conversionRate || 0}% Conversion</p>
              <p className="text-lg font-bold text-gray-700 mt-2">{sortedAgents[0]?.totalLeads || 0} Leads</p>
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">1</div>
          </div>

          {/* 3rd Place */}
          <div className="text-center">
            <div className="bg-orange-100 rounded-lg p-4 border-2 border-orange-300">
              <Award className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">
                {sortedAgents[2]?.firstName} {sortedAgents[2]?.lastName}
              </p>
              <p className="text-xs text-gray-500">{sortedAgents[2]?.conversionRate || 0}% Conversion</p>
              <p className="text-lg font-bold text-gray-700 mt-2">{sortedAgents[2]?.totalLeads || 0} Leads</p>
            </div>
            <div className="mt-2 text-2xl font-bold text-orange-500">3</div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Agent Leaderboard
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Leads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Converted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Properties</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAgents.map((agent, index) => {
                const rank = index + 1
                return (
                  <tr key={agent._id || agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getRankIcon(rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {agent.profileImage ? (
                          <img
                            src={agent.profileImage}
                            alt={`${agent.firstName} ${agent.lastName}`}
                            className="h-10 w-10 rounded-full mr-3"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold mr-3">
                            {agent.firstName?.[0]}{agent.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {agent.firstName} {agent.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{agent.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        {agent.totalLeads || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {agent.convertedLeads || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${agent.conversionRate || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {agent.conversionRate || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.totalProperties || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-primary-600" />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getRankBadge(rank)}`}>
                          {agent.score || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

