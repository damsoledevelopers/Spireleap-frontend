'use client'

import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import RevenueChart from '../Reports/Charts/RevenueChart'

export default function RevenueWidgets({ revenueData, period = '30d' }) {
  const totalRevenue = revenueData?.totalRevenue || 0
  const totalCommission = revenueData?.totalCommission || 0
  const revenueGrowth = revenueData?.revenueGrowth || 0
  const commissionGrowth = revenueData?.commissionGrowth || 0
  const recentTransactions = revenueData?.recentTransactions || []

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    ${totalRevenue.toLocaleString()}
                  </div>
                  {revenueGrowth !== 0 && (
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {revenueGrowth > 0 ? (
                        <ArrowUpRight className="self-center flex-shrink-0 h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="self-center flex-shrink-0 h-4 w-4" />
                      )}
                      <span>{Math.abs(revenueGrowth)}%</span>
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Commission</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    ${totalCommission.toLocaleString()}
                  </div>
                  {commissionGrowth !== 0 && (
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      commissionGrowth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {commissionGrowth > 0 ? (
                        <ArrowUpRight className="self-center flex-shrink-0 h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="self-center flex-shrink-0 h-4 w-4" />
                      )}
                      <span>{Math.abs(commissionGrowth)}%</span>
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Avg. Transaction</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  ${revenueData?.avgTransaction ? revenueData.avgTransaction.toLocaleString() : '0'}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {revenueData?.totalTransactions || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenueData?.chartData && revenueData.chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trends</h3>
          <RevenueChart data={revenueData.chartData} />
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.propertyTitle || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${transaction.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      ${transaction.commission?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

