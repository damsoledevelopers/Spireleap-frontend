'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { REPORT_NA } from '../../../lib/reportDisplay'

export default function AgentPerformanceChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-sm text-gray-500">
        {REPORT_NA}
      </div>
    )
  }

  const chartData = (data || []).slice(0, 10).map(agent => ({
    name: String(agent.name || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email || 'Agent').substring(0, 15),
    leads: agent.totalLeads || 0,
    converted: agent.convertedLeads || 0,
    conversionRate: agent.conversionRate || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
        <Bar dataKey="converted" fill="#10b981" name="Converted" />
      </BarChart>
    </ResponsiveContainer>
  )
}

