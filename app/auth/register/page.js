'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../../../contexts/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import PhoneField from '../../../components/Common/PhoneField'
import { buildE164Phone, splitE164Phone, DEFAULT_COUNTRY_CODE } from '../../../lib/phone'
import { validateConfirmPassword, validateEmail, validateName, validatePassword } from '../../../lib/validation'
import { scrollToFirstErrorField } from '../../../lib/scrollToError'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    agency: '',
    phone: '',
  })
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { register } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const parsed = splitE164Phone(formData.phone)
    setPhoneCountryCode(parsed.countryCode || DEFAULT_COUNTRY_CODE)
    if (parsed.phone !== formData.phone) {
      setFormData((prev) => ({ ...prev, phone: parsed.phone || '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const nextErrors = {}
    nextErrors.firstName = validateName(formData.firstName, 'First name')
    nextErrors.lastName = validateName(formData.lastName, 'Last name')
    nextErrors.email = validateEmail(formData.email, 'Email')
    nextErrors.password = validatePassword(formData.password)
    nextErrors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword)

    const e164Phone = formData.phone ? buildE164Phone(phoneCountryCode, formData.phone) : ''
    if (formData.phone && !e164Phone) {
      nextErrors.phone = 'Enter a valid phone number for the selected country'
    }

    // remove empty keys
    Object.keys(nextErrors).forEach((k) => {
      if (!nextErrors[k]) delete nextErrors[k]
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstErrorField(Object.keys(nextErrors))
      setLoading(false)
      return
    }

    try {
      const submitData = {
        ...formData,
        phone: e164Phone
      }
      const message = await register(submitData)
      toast.success(message || 'Registration successful!')
    } catch (error) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-logo-beige">
      <Header />
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center">
              <Image 
                src="/NovaKeys.png" 
                alt="NOVA KEYS Real Estate" 
                width={48} 
                height={48} 
                className="object-contain"
              />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Join NOVA KEYS Real Estate Platform
            </p>
          </div>
          <form className="mt-8 space-y-6 bg-logo-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-bold text-gray-900 mb-2">
                    First Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs font-semibold text-red-600">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-bold text-gray-900 mb-2">
                    Last Name<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs font-semibold text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
                  Email Address<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-gray-900 mb-2">
                  Phone Number
                </label>
                <PhoneField
                  label=""
                  countryCodeName="phoneCountryCode"
                  phoneName="phone"
                  countryCodeValue={phoneCountryCode}
                  phoneValue={formData.phone}
                  onCountryCodeChange={(value) => setPhoneCountryCode(value)}
                  onPhoneChange={(value) => {
                    setFormData((prev) => ({ ...prev, phone: value }))
                    if (errors.phone) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.phone
                        return next
                      })
                    }
                  }}
                  showInlineError={Boolean(formData.phone)}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-bold text-gray-900 mb-2">
                  Account Type<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="user">Property Seeker (User)</option>
                  {/* <option value="agent">Real Estate Agent</option>
                  <option value="agency_admin">Agency Admin</option>
                  <option value="staff">Staff Member</option> */}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.role === 'agent' || formData.role === 'agency_admin' 
                    ? 'Agency admin approval required for agent/admin accounts'
                    : formData.role === 'staff'
                    ? 'Admin approval required for staff accounts'
                    : 'Browse and search for properties'}
                </p>
              </div>

              {(formData.role === 'agent' || formData.role === 'agency_admin' || formData.role === 'staff') && (
                <div>
                  <label htmlFor="agency" className="block text-sm font-bold text-gray-900 mb-2">
                    Agency ID (Optional)
                  </label>
                  <input
                    id="agency"
                    name="agency"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter agency ID if you have one"
                    value={formData.agency}
                    onChange={handleChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank if you don't have an agency ID yet
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                  Password<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-900 mb-2">
                  Confirm Password<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign in
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
