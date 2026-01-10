'use client'

import { useState } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import ActivityFeed from '../../../components/Activity/ActivityFeed'
import { Activity, Filter } from 'lucide-react'

export default function ActivitiesPage() {
  const [filter, setFilter] = useState({ entityType: '', entityId: '' })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Activity Feed
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View all system activities and audit logs
            </p>
          </div>
        </div>

        <ActivityFeed entityType={filter.entityType} entityId={filter.entityId} limit={100} />
      </div>
    </DashboardLayout>
  )
}

