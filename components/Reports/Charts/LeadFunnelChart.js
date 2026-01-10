'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function LeadFunnelChart({ data }) {
  const chartData = [
    { name: 'New', value: data.new || 0 },
    { name: 'Contacted', value: data.contacted || 0 },
    { name: 'Qualified', value: data.qualified || 0 },
    { name: 'Site Visit', value: data.site_visit_scheduled || 0 },
    { name: 'Negotiation', value: data.negotiation || 0 },
    { name: 'Booked', value: data.booked || 0 },
    { name: 'Lost', value: data.lost || 0 }
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#3b82f6" name="Leads" />
      </BarChart>
    </ResponsiveContainer>
  )
}

