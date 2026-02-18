'use client'

import { useEffect, useState } from 'react'
import Header from '../../components/Layout/Header'
import Footer from '../../components/Layout/Footer'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  ChevronLeft,
  ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function BillingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('razorpay')

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await api.get('/subscriptions/plans')
      // Only include plans that are marked active/enabled
      const allPlans = response.data.plans || []
      const activePlans = Array.isArray(allPlans) ? allPlans.filter(p => p && p.isActive) : []
      setPlans(activePlans)
    } catch (error) {
      console.error('Error fetching subscription plans:', error)
      toast.error('Failed to load plans.')
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (document.getElementById('razorpay-script')) return resolve(true)
      const script = document.createElement('script')
      script.id = 'razorpay-script'
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => reject(new Error('Razorpay SDK failed to load'))
      document.body.appendChild(script)
    })
  }

  const handleSubscribeClick = (plan) => {
    if (!user) {
      toast.error('Please login to continue to payment')
      router.push('/auth/login')
      return
    }
    setSelectedPlan(plan)
    setPaymentMethod('razorpay')
    setShowPaymentModal(true)
  }

  const handleStartPayment = async () => {
    if (!selectedPlan) return
    try {
      if (paymentMethod === 'razorpay') {
        await loadRazorpayScript()
        const orderRes = await api.post('/subscriptions/create-order', { planId: selectedPlan._id })
        const { order, key } = orderRes.data
        const options = {
          key: key || process.env.NEXT_PUBLIC_RAZORPAY_KEY,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: order.notes?.name || 'Spireleap',
          description: selectedPlan.name,
          order_id: order.id,
          prefill: {
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`
          },
          handler: async function (response) {
            try {
              const confirmRes = await api.post('/subscriptions/confirm', {
                planId: selectedPlan._id,
                provider: 'razorpay',
                providerResponse: response
              })
              const subscription = confirmRes.data.subscription
              toast.success('Payment successful. Opening your invoice…')
              setShowPaymentModal(false)
              fetchPlans()
              fetchMyInvoices()
              if (subscription && subscription._id) {
                router.push(`/subscription/invoice?id=${subscription._id}`)
              }
            } catch (err) {
              console.error('Subscription confirmation failed:', err)
              toast.error('Payment succeeded but confirmation failed. Contact support.')
            }
          },
          modal: {
            ondismiss: function () {}
          }
        }
        // eslint-disable-next-line no-undef
        const rzp = new window.Razorpay(options)
        rzp.open()
      } else {
        const confirmRes = await api.post('/subscriptions/confirm', {
          planId: selectedPlan._id,
          provider: 'dummy',
          providerResponse: { status: 'success' }
        })
        const subscription = confirmRes.data.subscription
        toast.success('Dummy payment completed.')
        setShowPaymentModal(false)
        fetchPlans()
        if (subscription && subscription._id) {
          router.push(`/subscription/invoice?id=${subscription._id}`)
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-logo-offWhite">
      <Header />

      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Breadcrumb + Back */}
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <nav className="text-sm text-gray-500">
              <span className="mr-2">Billing</span>
              <span className="text-gray-300">/</span>
              <span className="ml-2 font-medium text-gray-700">Subscription Plans</span>
            </nav>
          </div>

          {/* Hero */}
          <header className="bg-white rounded-2xl p-8 shadow-md mb-10">
            <div className="md:flex md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Subscription Plans</h1>
                <p className="text-gray-600 mt-2 max-w-xl">
                  Unlock premium features and priority support. Choose a plan that fits your needs — you can upgrade, downgrade, or cancel anytime.
                </p>
              </div>
              <div className="mt-6 md:mt-0 flex items-center gap-4">
                <div className="text-sm text-gray-600">Billing cycle</div>
                {/* Note: original plan data may not contain monthly/yearly breakdown.
                    We keep a simple toggle that prefers `monthlyPrice`/`yearlyPrice` if present,
                    otherwise falls back to `price` */}
              </div>
            </div>
          </header>

          {/* Plans Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {plans.length === 0 ? (
              <div className="col-span-3 text-center text-gray-500 py-12 bg-white rounded-2xl shadow-sm">
                No plans available at the moment. Please check back later.
              </div>
            ) : plans.map((plan) => {
              const monthly = plan.monthlyPrice ?? plan.price ?? null
              const yearly = plan.yearlyPrice ?? (plan.price && plan.interval === 'year' ? plan.price : null)
              const priceLabel = monthly ? `$${monthly}` : (yearly ? `$${yearly}` : 'Contact')
              const isRecommended = plan.recommended || plan.tier === 'pro'

              return (
                <div
                  key={plan._id}
                  className={`relative bg-white rounded-2xl p-6 border ${isRecommended
                    ? 'border-primary-600 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1'
                    : 'border-gray-100 shadow-lg hover:shadow-2xl transform hover:-translate-y-1'} flex flex-col transition-all duration-300`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow">Recommended</div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      {plan.subtitle && <p className="text-sm text-gray-500 mt-1">{plan.subtitle}</p>}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-extrabold text-primary-700">{priceLabel}</div>
                      {plan.interval && <div className="text-sm text-gray-500">/ {plan.interval}</div>}
                    </div>
                  </div>

                  <ul className="mb-6 text-sm text-gray-700 space-y-2 flex-1">
                    {(plan.features || []).length === 0 ? (
                      <li className="text-gray-400 italic">No feature list provided.</li>
                    ) : (plan.features || []).map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 text-primary-600">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => handleSubscribeClick(plan)}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white ${isRecommended ? 'bg-primary-700 hover:bg-primary-800' : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800'}`}
                    >
                      Subscribe
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(plan)
                        setShowPaymentModal(true)
                      }}
                      className="px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700"
                    >
                      Details
                    </button>
                  </div>
                </div>
              )
            })}
          </section>

          {/* Comparison / CTA */}
          <section className="bg-white rounded-2xl p-6 shadow-md">
            <div className="md:flex md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Need help choosing?</h2>
                <p className="text-sm text-gray-600 mt-1">Contact our sales team for recommendations or to request a custom plan for your organization.</p>
              </div>
              <div className="mt-4 md:mt-0">
                <a href="/contact" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 shadow">
                  Contact Sales <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">Subscribe to {selectedPlan.name}</h3>
                <p className="text-sm text-gray-500">{selectedPlan.description}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500">Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <div className="mt-2 text-2xl font-extrabold text-primary-700">{selectedPlan.price ? `$${selectedPlan.price}` : 'Contact Support'}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment method</p>
                <div className="flex gap-3 mt-3">
                  <label className={`px-4 py-2 border rounded-lg cursor-pointer ${paymentMethod === 'razorpay' ? 'border-primary-600 bg-primary-50' : ''}`}>
                    <input type="radio" name="pm" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="mr-2" />
                    Razorpay
                  </label>
                  <label className={`px-4 py-2 border rounded-lg cursor-pointer ${paymentMethod === 'dummy' ? 'border-primary-600 bg-primary-50' : ''}`}>
                    <input type="radio" name="pm" checked={paymentMethod === 'dummy'} onChange={() => setPaymentMethod('dummy')} className="mr-2" />
                    Dummy
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleStartPayment} className="px-6 py-2 bg-primary-600 text-white rounded-lg">Pay & Continue</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

