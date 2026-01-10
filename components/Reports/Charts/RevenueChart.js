'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function RevenueChart({ data }) {
  const chartData = (data || []).map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.revenue || 0,
    commission: item.commission || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" />
        <Line type="monotone" dataKey="commission" stroke="#10b981" name="Commission" />
      </LineChart>
    </ResponsiveContainer>
  )
}

