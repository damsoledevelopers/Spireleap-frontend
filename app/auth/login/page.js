'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../../../contexts/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Trim email and password to remove any accidental spaces
      const email = formData.email.trim()
      const password = formData.password.trim()
      const userData = await login(email, password, { rememberMe })
      if (userData?.requiresOtp) {
        setOtpStep(true)
        setChallengeToken(userData.challengeToken || '')
        setMaskedEmail(userData.maskedEmail || email)
        setLoading(false)
        toast.success('OTP sent to your email')
        return
      }
      toast.success('Login successful!')
      // Navigation happens in AuthContext, but we can add a small delay for toast
      setTimeout(() => {
        // Navigation is handled in AuthContext
      }, 500)
    } catch (error) {
      toast.error(error.message || 'Login failed')
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { api } = await import('../../../lib/api')
      const response = await api.post('/auth/verify-login-otp', {
        challengeToken,
        otp: String(otp || '').trim()
      })
      const { token, user } = response.data || {}
      const { setToken } = await import('../../../lib/tokenStorage')
      setToken(token, { rememberMe })
      // Trigger normal post-login route flow by reusing login API with verified token in storage
      toast.success('Login successful!')
      if (user?.role === 'super_admin') {
        window.location.href = '/admin/dashboard'
      } else if (user?.role === 'agency_admin') {
        window.location.href = '/agency/dashboard'
      } else if (user?.role === 'agent') {
        window.location.href = '/agent/dashboard'
      } else if (user?.role === 'staff') {
        window.location.href = '/staff/dashboard'
      } else {
        window.location.href = '/customer/dashboard'
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP')
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!challengeToken) return
    try {
      const { api } = await import('../../../lib/api')
      const response = await api.post('/auth/resend-login-otp', { challengeToken })
      setChallengeToken(response.data?.challengeToken || challengeToken)
      toast.success('OTP resent')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              NOVA KEYS Real Estate Platform
            </p>
          </div>
          <form className="mt-8 space-y-6 bg-logo-white p-8 rounded-xl shadow-lg" onSubmit={otpStep ? handleVerifyOtp : handleSubmit}>
            <div className="space-y-4">
              {!otpStep && (
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
                  Email address<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              )}
              {!otpStep && (
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                  Password<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your password"
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
              </div>
              )}
              {otpStep && (
                <div>
                  <label htmlFor="otp" className="block text-sm font-bold text-gray-900 mb-2">
                    Enter OTP
                  </label>
                  <p className="text-xs text-gray-500 mb-2">OTP sent to {maskedEmail}</p>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
              )}
            </div>

            {!otpStep && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/auth/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  otpStep ? 'Verify OTP' : 'Sign in'
                )}
              </button>
            </div>

            {otpStep && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-medium text-primary-600 hover:text-primary-500 text-sm"
                >
                  Resend OTP
                </button>
              </div>
            )}

            {!otpStep && (
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/auth/register"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign up
                </Link>
              </span>
            </div>
            )}

            {!otpStep && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                For agents and agency admins, please use your registered credentials
              </p>
            </div>
            )}
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
