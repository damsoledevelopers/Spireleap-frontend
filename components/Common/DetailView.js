'use client'

import { Package } from 'lucide-react'

export default function DetailView({ 
  title, 
  subtitle,
  image,
  sections = [],
  actions = [],
  loading = false 
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {image && (
              <div className="flex-shrink-0">
                <img
                  src={image}
                  alt={title}
                  className="h-32 w-32 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="h-32 w-32 bg-gray-200 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                  <Package className="h-12 w-12 text-gray-400" />
                </div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          {actions.length > 0 && (
            <div className="flex items-center gap-3">
              {actions.map((action, index) => (
                <div key={index}>{action}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          {section.title && (
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {section.icon && <section.icon className="h-5 w-5 text-primary-600" />}
              {section.title}
            </h2>
          )}
          <div className={section.grid ? `grid ${section.grid} gap-4` : 'space-y-4'}>
            {section.fields?.map((field, fieldIndex) => (
              <div key={fieldIndex}>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  {field.label}
                </label>
                <div className="text-sm text-gray-900">
                  {field.render ? field.render(field.value) : (field.value || 'N/A')}
                </div>
              </div>
            ))}
            {section.content && <div>{section.content}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

