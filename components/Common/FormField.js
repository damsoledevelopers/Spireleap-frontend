'use client'

import SearchableSelect from './SearchableSelect'

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  options = [],
  rows,
  className = '',
  disabled = false
}) {
  const baseInputClass = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
    error ? 'border-red-300' : 'border-gray-300'
  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`

  return (
    <div className="form-group">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          rows={rows || 4}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={baseInputClass}
        />
      ) : type === 'select' ? (
        <SearchableSelect
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder || 'Select...'}
          options={options}
          buttonClassName={baseInputClass}
        />
      ) : type === 'checkbox' ? (
        <div className="flex items-center">
          <input
            id={name}
            name={name}
            type="checkbox"
            checked={value}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          {helpText && (
            <label htmlFor={name} className="ml-2 block text-sm text-gray-700">
              {helpText}
            </label>
          )}
        </div>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={baseInputClass}
        />
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helpText && type !== 'checkbox' && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

