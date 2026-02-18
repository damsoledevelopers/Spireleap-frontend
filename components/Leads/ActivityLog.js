'use client'

import { formatDistanceToNow } from 'date-fns'
import {
    Activity,
    GitCommit,
    Edit,
    MessageSquare,
    CheckSquare,
    Clock,
    Upload,
    Calendar,
    Trash2,
    UserPlus,
    AlertCircle,
    ArrowRight
} from 'lucide-react'

const getActivityIcon = (action) => {
    switch (action) {
        case 'status_change':
            return <GitCommit className="h-5 w-5 text-blue-600" />
        case 'priority_change':
            return <AlertCircle className="h-5 w-5 text-orange-600" />
        case 'assignment_change':
            return <UserPlus className="h-5 w-5 text-purple-600" />
        case 'note_added':
            return <Edit className="h-5 w-5 text-yellow-600" />
        case 'communication_added':
            return <MessageSquare className="h-5 w-5 text-green-600" />
        case 'task_added':
        case 'task_updated':
        case 'task_deleted':
            return <CheckSquare className="h-5 w-5 text-indigo-600" />
        case 'reminder_added':
        case 'reminder_updated':
        case 'reminder_deleted':
            return <Clock className="h-5 w-5 text-red-600" />
        case 'document_uploaded':
        case 'document_deleted':
            return <Upload className="h-5 w-5 text-gray-600" />
        case 'site_visit_scheduled':
        case 'site_visit_completed':
        case 'site_visit_cancelled':
        case 'site_visit_updated':
            return <Calendar className="h-5 w-5 text-pink-600" />
        case 'merged':
            return <GitCommit className="h-5 w-5 text-purple-600" />
        case 'lead_created':
            return <UserPlus className="h-5 w-5 text-green-600" />
        default:
            return <Activity className="h-5 w-5 text-gray-500" />
    }
}

const getActivityColor = (action) => {
    switch (action) {
        case 'status_change': return 'bg-blue-100 border-blue-200'
        case 'priority_change': return 'bg-orange-100 border-orange-200'
        case 'assignment_change': return 'bg-purple-100 border-purple-200'
        case 'lead_created': return 'bg-green-100 border-green-200'
        case 'site_visit_scheduled':
        case 'site_visit_completed':
        case 'site_visit_cancelled':
        case 'site_visit_updated': return 'bg-pink-100 border-pink-200'
        default: return 'bg-gray-50 border-gray-200'
    }
}

export default function ActivityLog({ activities = [] }) {
    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No activity history found</p>
            </div>
        )
    }

    // Sort activities by date descending (newest first)
    const sortedActivities = [...activities].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    )

    return (
        <div className="space-y-6">
            <div className="flow-root">
                <ul className="-mb-8">
                    {sortedActivities.map((activity, idx) => {
                        const isLast = idx === sortedActivities.length - 1
                        const date = new Date(activity.timestamp)

                        return (
                            <li key={activity._id || idx}>
                                <div className="relative pb-8">
                                    {!isLast && (
                                        <span
                                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <div className="relative flex space-x-3">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getActivityColor(activity.action?.type || activity.action)}`}>
                                            {getActivityIcon(activity.action?.type || activity.action)}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1.5">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm text-gray-900 font-medium">
                                                        {formatActivityTitle(activity)}
                                                    </p>
                                                    <p className="mt-0.5 text-sm text-gray-500">
                                                        {formatActivityDescription(activity)}
                                                    </p>
                                                </div>
                                                <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                                    <time dateTime={date.toISOString()} title={date.toLocaleString()}>
                                                        {formatDistanceToNow(date, { addSuffix: true })}
                                                    </time>
                                                </div>
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                by <span className="font-medium text-gray-900">
                                                    {activity.performedBy?.firstName
                                                        ? `${activity.performedBy.firstName} ${activity.performedBy.lastName}`
                                                        : 'System'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

function formatActivityTitle(activity) {
    const action = activity.action?.type || activity.action
    switch (action) {
        case 'status_change': return 'Status Changed'
        case 'priority_change': return 'Priority Changed'
        case 'assignment_change': return 'Agent Assigned'
        case 'note_added': return 'Note Added'
        case 'communication_added': return 'Communication Logged'
        case 'task_added': return 'Task Created'
        case 'task_updated': return 'Task Updated'
        case 'task_deleted': return 'Task Deleted'
        case 'reminder_added': return 'Reminder Set'
        case 'reminder_updated': return 'Reminder Updated'
        case 'reminder_deleted': return 'Reminder Deleted'
        case 'document_uploaded': return 'Document Uploaded'
        case 'document_deleted': return 'Document Deleted'
        case 'site_visit_scheduled': return 'Site Visit Scheduled'
        case 'site_visit_completed': return 'Site Visit Completed'
        case 'lead_created': return 'Lead Created'
        case 'lead_updated': return 'Lead Updated'
        case 'merged': return 'Lead Merged'
        default: return action?.replace(/_/g, ' ') || 'Activity'
    }
}

function formatActivityDescription(activity) {
    const details = activity.details || {}

    if (details.description) {
        return details.description
    }

    // Fallback generation if no description is stored
    const action = activity.action?.type || activity.action
    switch (action) {
        case 'status_change':
            return `Status changed from ${details.oldValue || '...'} to ${details.newValue || '...'}`
        case 'priority_change':
            return `Priority changed from ${details.oldValue || '...'} to ${details.newValue || '...'}`
        case 'assignment_change':
            return `Assigned to ${details.newValue || 'agent'}`
        default:
            return 'Activity logged'
    }
}
