'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'

export default function InvoicePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const subscriptionId = searchParams.get('id')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!subscriptionId) {
      setError('No invoice id provided')
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      try {
        const res = await api.get(`/subscriptions/${subscriptionId}`)
        setSubscription(res.data.subscription)
      } catch (err) {
        console.error('Error fetching subscription invoice:', err)
        setError('Unable to load invoice. Please contact support.')
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [subscriptionId])

  const handlePrint = () => {
    window.print()
  }

  const invoiceRef = useRef(null)

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Window is undefined'))
      if (window.html2pdf) return resolve()
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error(`Failed to load script ${src}`))
      document.body.appendChild(s)
    })
  }

  const handleDownloadPDF = async () => {
    if (!subscription || !invoiceRef.current) return

    try {
      // load bundled html2pdf (includes html2canvas + jsPDF)
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js')

      const element = invoiceRef.current

      // Build a safe filename using the logged-in customer's name (fallback to email)
      const rawName = subscription.user
        ? `${(subscription.user.firstName || '').trim()}${subscription.user.lastName ? ` ${subscription.user.lastName.trim()}` : ''}`.trim() || subscription.user.email || 'customer'
        : 'customer'
      const safeName = rawName.replace(/[^\w\-\.]+/g, '_') // replace spaces/special chars with underscore
      const pdfFilename = `${safeName}_invoice.pdf`

      const opt = {
        margin: 10,
        filename: pdfFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      // @ts-ignore - html2pdf is added at runtime
      window.html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Unable to generate PDF. Please try printing from the browser as a fallback.')
    }
  }

  const handleDownloadJSON = () => {
    if (!subscription) return

    // Create a well-structured invoice JSON that mirrors the visual invoice
    const billedName = subscription.user ? `${subscription.user.firstName || ''} ${subscription.user.lastName || ''}`.trim() : 'Guest'
    const itemAmount = subscription.price ?? subscription.plan?.price ?? 0
    const invoice = {
      invoiceFor: subscription.plan?.plan_name || subscription.planName || 'Subscription',
      provider: subscription.provider,
      billedOn: {
        iso: subscription.startedAt,
        formatted: new Date(subscription.startedAt).toLocaleString()
      },
      billedTo: {
        name: billedName,
        email: subscription.user?.email,
        phone: subscription.user?.phone
      },
      items: [
        {
          description: subscription.planName || 'Subscription',
          unitPrice: itemAmount,
          quantity: 1,
          amount: itemAmount
        }
      ],
      subtotal: itemAmount,
      taxes: 0,
      total: itemAmount,
      currency: 'USD'
    }

    const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const datePart = new Date(subscription.startedAt).toISOString().split('T')[0]
    a.download = `invoice-${subscription.user?.email || 'invoice'}-${datePart}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading invoice...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>
  if (!subscription) return null

  const itemAmount = subscription.price ?? subscription.plan?.price ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Invoice</h1>

        <div id="invoice-card" className="bg-white rounded-lg p-6 shadow">
          <div ref={invoiceRef}>
            {/* Company logo (appears on printed page and in generated PDF).
                Provide a URL via subscription.company.logoUrl, or place a default
                logo at /logo.svg in the public folder. */}
            <div className="mb-4">
              <img
                src={subscription.company?.logoUrl || '/NovaKeys.png'}
                alt="Company logo"
                crossOrigin="anonymous"
                style={{ height: 48 }}
                className="object-contain"
              />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold">Invoice for {subscription.planName || 'Subscription'}</h2>
                <div className="text-sm text-gray-600">Provider: {subscription.provider}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{itemAmount ? `$${itemAmount}` : 'Contact'}</div>
                <div className="text-sm text-gray-500">Billed on: {new Date(subscription.startedAt).toLocaleString()}</div>
              </div>
            </div>

            <section className="mb-6">
              <h3 className="font-semibold mb-2">Billed To</h3>
              <div className="text-sm text-gray-700">
                {subscription.user ? (
                  <>
                    <div>{subscription.user.firstName} {subscription.user.lastName}</div>
                    <div className="text-gray-500">{subscription.user.email}</div>
                    {subscription.user.phone && <div className="text-gray-500">{subscription.user.phone}</div>}
                  </>
                ) : (
                  <div>Guest</div>
                )}
              </div>
            </section>

            <section className="mb-6">
              <h3 className="font-semibold mb-2">Details</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2">Item</th>
                    <th className="pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">{subscription.plan?.plan_name || subscription.planName || 'Subscription'}</td>
                    <td className="py-2">{subscription.price ? `$${subscription.price}` : (subscription.plan?.price ? `$${subscription.plan.price}` : 'Contact')}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Payment provider response intentionally hidden from invoice and JSON */}

          </div>

          {/* Action buttons — excluded from PDF/print via .no-print */}
          <div className="flex gap-3 justify-end mt-4 no-print">
            <button onClick={() => router.push('/')} className="px-4 py-2 border rounded">Back to Home</button>
            <button onClick={handleDownloadPDF} className="px-4 py-2 bg-gray-800 text-white rounded">Download PDF</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-primary-600 text-white rounded">Print</button>
          </div>
        </div>
      </main>
      <Footer />
      <style jsx>{`
        /* Print only the invoice card */
        @media print {
          /* hide everything first */
          :global(body) * {
            visibility: hidden !important;
          }

          /* show only the invoice card and its children */
          :global(#invoice-card),
          :global(#invoice-card) * {
            visibility: visible !important;
          }

          /* position the invoice at the top-left for printing */
          :global(#invoice-card) {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-sizing: border-box;
          }

          /* ensure action buttons (and other .no-print) are hidden */
          :global(.no-print) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )

}

