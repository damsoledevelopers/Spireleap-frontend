'use client'

export default function FormSection({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
          {Icon && <Icon className="h-5 w-5 text-primary-600" />}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      {children}
    </div>
  )
}

