'use client'

export default function FormSection({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {title && (
        <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-primary-200 bg-gradient-to-r from-primary-50 to-white -mx-6 -mt-6 px-6 pt-5 rounded-t-lg">
          {Icon && <Icon className="h-5 w-5 text-primary-600 flex-shrink-0" />}
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
        </div>
      )}
      {children}
    </div>
  )
}

