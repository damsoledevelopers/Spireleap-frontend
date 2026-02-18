'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../../components/Layout/DashboardLayout'
import { api } from '../../../lib/api'
import {
    FileText,
    Download,
    Eye,
    Calendar,
    Building,
    DollarSign,
    Search,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    MapPin,
    Check,
    CreditCard,
    X,
    Wallet,
    ArrowLeft,
    User,
    Mail,
    Phone
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useRouter } from 'next/navigation'

export default function MyInvoices() {
    const router = useRouter()
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('invoices')
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [selectedTransaction, setSelectedTransaction] = useState(null)
    const [processingPayment, setProcessingPayment] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState(null)
    const [fetchingDetails, setFetchingDetails] = useState(false)

    useEffect(() => {
        fetchInvoices()
    }, [])

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            // Fetch transactions for the current logged-in user (automatically filtered by user ID on backend)
            const res = await api.get('/transactions/my-transactions')
            // Ensure we have an array
            const transactions = Array.isArray(res.data) ? res.data : (res.data.transactions || [])
            setInvoices(transactions)
        } catch (error) {
            console.error('Error fetching invoices:', error)
            toast.error('Failed to load invoices')
            setInvoices([])
        } finally {
            setLoading(false)
        }
    }

    const handleViewProperty = (property) => {
        if (property?.slug) {
            router.push(`/properties/${property.slug}`)
        } else if (property?._id) {
            router.push(`/properties/${property._id}`)
        } else {
            toast.error('Property details not available')
        }
    }

    const handleViewDetails = async (invoice) => {
        try {
            setSelectedInvoice(invoice)
            setShowDetailsModal(true)
            setFetchingDetails(true)

            // Fetch fresh details to get all payment information filled by admin/agency
            const res = await api.get(`/transactions/my-transactions/${invoice._id}`)
            const transactionData = res.data.transaction || res.data
            const payment = res.data.payment || transactionData.payment

            // Derive paymentDetails when not set by admin - ensure Amount Paid & Due Amount are always available
            let paymentDetails = transactionData.paymentDetails || invoice.paymentDetails
            if (!paymentDetails && payment) {
                const total = Number(transactionData.amount ?? payment.amount ?? invoice.amount ?? 0)
                const paid = payment.status === 'completed' ? Number(payment.amount ?? 0) : 0
                paymentDetails = {
                    amountPaid: paid,
                    dueAmount: Math.max(0, total - paid),
                    paymentDate: payment.paymentDate || payment.createdAt || transactionData.transactionDate,
                    paymentMethod: payment.paymentMethod,
                    transactionReference: payment.receipt?.number
                }
            }

            setSelectedInvoice({
                ...invoice,
                ...transactionData,
                payment,
                paymentDetails,
                notes: transactionData.notes || invoice.notes
            })
        } catch (error) {
            console.error('Error fetching transaction details:', error)
            toast.error('Failed to load transaction details')
        } finally {
            setFetchingDetails(false)
        }
    }

    const initiateConfirmPayment = (transaction) => {
        setSelectedTransaction(transaction)
        setShowConfirmModal(true)
    }

    const handleConfirmProperty = async (transaction) => {
        if (!transaction) return

        if (!window.confirm(`Are you sure you want to confirm the booking for ${transaction.property?.title || 'this property'}?`)) {
            return
        }

        try {
            setProcessingPayment(true)
            await api.post(`/transactions/my-transactions/${transaction._id}/confirm`)

            toast.success('Property confirmed! Waiting for final admin approval.')
            fetchInvoices() // Refresh list
        } catch (error) {
            console.error('Error confirming property:', error);
            toast.error(error.response?.data?.message || 'Failed to confirm property')
        } finally {
            setProcessingPayment(false)
        }
    }

    const handleDownload = async (transaction) => {
        try {
            toast.loading('Preparing download...', { id: 'download' })

            // Fetch transaction details to get payment information
            // This ensures we have the latest payment details filled by admin/agency
            const res = await api.get(`/transactions/my-transactions/${transaction._id}`)
            const transactionData = res.data.transaction || res.data
            const paymentId = transactionData.payment?._id || res.data.payment?._id

            if (!paymentId) {
                toast.error('Payment record not found for this transaction. Please contact support.', { id: 'download' })
                return
            }

            // Download the receipt/invoice PDF with all payment details
            const downloadRes = await api.get(`/payments/${paymentId}/receipt`, {
                responseType: 'blob'
            })

            const url = window.URL.createObjectURL(new Blob([downloadRes.data]))
            const link = document.createElement('a')
            link.href = url
            const fileName = `invoice-${transaction.property?.title?.replace(/\s+/g, '-') || transaction._id || 'invoice'}.pdf`
            link.setAttribute('download', fileName)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            toast.success('Invoice downloaded successfully', { id: 'download' })
        } catch (error) {
            console.error('Error downloading invoice:', error)
            toast.error(error.response?.data?.message || 'Failed to download invoice', { id: 'download' })
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = invoice.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.agency?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'invoices') {
            return matchesSearch && (invoice.status === 'completed' || invoice.status === 'refunded');
        } else {
            return matchesSearch && invoice.status === 'pending';
        }
    })

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200'
            case 'pending':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'cancelled':
                return 'bg-red-100 text-red-700 border-red-200'
            case 'refunded':
                return 'bg-gray-100 text-gray-700 border-gray-200'
            default:
                return 'bg-blue-100 text-blue-700 border-blue-200'
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="h-4 w-4 mr-1.5" />
            case 'pending': return <Clock className="h-4 w-4 mr-1.5" />
            case 'cancelled': return <XCircle className="h-4 w-4 mr-1.5" />
            default: return <AlertCircle className="h-4 w-4 mr-1.5" />
        }
    }

    const formatCurrency = (amount, currency = 'INR') => {
        const n = Number(amount || 0)
        return currency === 'INR' ? `₹${n.toLocaleString('en-IN')}` : `${currency} ${n.toLocaleString()}`
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Invoices & Payments</h1>
                        <p className="text-gray-500 text-sm mt-1">View and download your transaction history and receipts.</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-1">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'invoices' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Invoices
                            {activeTab === 'invoices' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('booked')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'booked' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Booked
                            {activeTab === 'booked' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
                        </button>
                    </div>
                    <div className="relative pb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search properties..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-full md:w-64 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100"></div>
                        ))}
                    </div>
                ) : filteredInvoices.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property & Agency</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredInvoices.map((invoice) => (
                                        <tr key={invoice._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center mr-3 flex-shrink-0">
                                                        <Building className="h-5 w-5 text-primary-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">
                                                            {invoice.property?.title || 'Property Transaction'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">{invoice.agency?.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center text-sm text-gray-600 font-medium">
                                                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                    {new Date(invoice.transactionDate).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${invoice.type === 'sale' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                                    }`}>
                                                    {invoice.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-extrabold text-gray-900">
                                                    ₹{invoice.amount?.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${invoice.customerConfirmed && invoice.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200' : getStatusStyle(invoice.status)}`}>
                                                    {invoice.customerConfirmed && invoice.status === 'pending' ? <Check className="h-4 w-4 mr-1.5" /> : getStatusIcon(invoice.status)}
                                                    {invoice.customerConfirmed && invoice.status === 'pending' ? 'Confirmed' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleViewDetails(invoice)}
                                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-5 w-5" />
                                                    </button>
                                                    {activeTab === 'booked' && (
                                                        <button
                                                            onClick={() => handleConfirmProperty(invoice)}
                                                            disabled={processingPayment || invoice.customerConfirmed}
                                                            className={`p-2 rounded-lg transition-all disabled:opacity-50 ${invoice.customerConfirmed ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                            title={invoice.customerConfirmed ? "Confirmed by you" : "Confirm Property"}
                                                        >
                                                            {invoice.customerConfirmed ? <Check className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                                        </button>
                                                    )}
                                                    {activeTab === 'invoices' && (
                                                        <button
                                                            onClick={() => handleDownload(invoice)}
                                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                            title="Download PDF"
                                                        >
                                                            <Download className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="h-10 w-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {activeTab === 'invoices' ? 'No invoices found' : 'No pending bookings'}
                        </h2>
                        <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                            {activeTab === 'invoices'
                                ? "You haven't made any successful transactions yet."
                                : "You don't have any properties booked that are awaiting payment."}
                        </p>
                    </div>
                )}

                {/* Info Card */}
                <div className="bg-logo-beige rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-start">
                        <div className="p-2 bg-white rounded-lg mr-4">
                            <DollarSign className="h-5 w-5 text-gray-700" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-gray-900 mb-2">Payment Information</h3>
                            {invoices.filter(inv => inv.payment).length > 0 ? (
                                <div className="space-y-3">
                                    {invoices.filter(inv => inv.payment).slice(0, 3).map((inv) => (
                                        <div key={inv.payment._id} className="bg-white/50 rounded-lg p-3 text-sm border border-gray-100">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        Payment for {inv.property?.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        via {inv.payment.paymentMethod?.replace('_', ' ')?.toUpperCase() || 'UNKNOWN'} • {new Date(inv.payment.paymentDate || inv.payment.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">₹{inv.payment.amount?.toLocaleString()}</p>
                                                    <p className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full inline-block mt-1">
                                                        {inv.payment.status?.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            {inv.payment.receipt?.number && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center text-xs text-gray-500">
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    Receipt #: <span className="font-mono ml-1 text-gray-700">{inv.payment.receipt.number}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {invoices.filter(inv => inv.payment).length > 3 && (
                                        <p className="text-xs text-center text-gray-500 pt-1">
                                            + {invoices.filter(inv => inv.payment).length - 3} more payments
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    All invoices are generated automatically upon successful transaction completion. If you notice any discrepancies in your billing history, please contact our support team immediately.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Details Modal */}
            {showDetailsModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    ID: <span className="font-mono">{selectedInvoice._id}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {fetchingDetails ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                                <p className="text-gray-500">Loading details...</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-8">
                                {/* Consolidated Details Grid */}
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Property</p>
                                            <p className="text-sm font-bold text-gray-900">{selectedInvoice.property?.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{selectedInvoice.property?.location?.city || selectedInvoice.property?.location?.address || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Agency & Agent</p>
                                            <p className="text-sm font-bold text-gray-900">{selectedInvoice.agency?.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{selectedInvoice.agent?.firstName} {selectedInvoice.agent?.lastName}</p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200/50 md:border-none">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Transaction Date</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date(selectedInvoice.transactionDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200/50 md:border-none">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(selectedInvoice.status)}`}>
                                                {selectedInvoice.status}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200/50">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Type</p>
                                            <p className="text-sm font-bold text-gray-900 capitalize">{selectedInvoice.type}</p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200/50">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                                            <p className="text-lg font-extrabold text-gray-900">{formatCurrency(selectedInvoice.amount, selectedInvoice.payment?.currency || selectedInvoice.currency || 'INR')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Details Section - Amount Paid & Due Amount */}
                                {selectedInvoice.paymentDetails && (
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                                            <DollarSign className="h-5 w-5 text-[#700E08]" />
                                            Payment Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount Paid</p>
                                                <p className="text-xl font-extrabold text-emerald-700">
                                                    {formatCurrency(selectedInvoice.paymentDetails.amountPaid, selectedInvoice.payment?.currency || selectedInvoice.currency || 'INR')}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Amount received from customer</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Due Amount</p>
                                                <p className="text-xl font-extrabold text-amber-700">
                                                    {formatCurrency(selectedInvoice.paymentDetails.dueAmount ?? 0, selectedInvoice.payment?.currency || selectedInvoice.currency || 'INR')}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Remaining amount to be paid</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Date</p>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-[#700E08]" />
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {selectedInvoice.paymentDetails.paymentDate 
                                                            ? new Date(selectedInvoice.paymentDetails.paymentDate).toLocaleDateString(undefined, { dateStyle: 'long' })
                                                            : 'Not specified'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4 text-[#700E08]" />
                                                    <p className="text-sm font-bold text-gray-900 capitalize">
                                                        {selectedInvoice.paymentDetails.paymentMethod?.replace('_', ' ') || 'Not specified'}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedInvoice.paymentDetails.transactionReference && (
                                                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm md:col-span-2">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Transaction Reference / Receipt Number</p>
                                                    <p className="text-sm font-mono font-bold text-gray-900">
                                                        {selectedInvoice.paymentDetails.transactionReference}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {selectedInvoice.notes && (
                                            <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Additional Notes</p>
                                                <p className="text-sm text-gray-700 leading-relaxed">{selectedInvoice.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Payment info fallback (shown only if payment exists but paymentDetails couldn't be derived) */}
                                {!selectedInvoice.paymentDetails && selectedInvoice.payment && (
                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                                            <Wallet className="h-5 w-5 text-[#700E08]" />
                                            Payment Information
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Amount</p>
                                                <p className="text-lg font-extrabold text-gray-900">
                                                    {formatCurrency(selectedInvoice.payment.amount, selectedInvoice.payment.currency || 'INR')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
                                                <p className="text-sm font-bold text-gray-900 capitalize">
                                                    {selectedInvoice.payment.paymentMethod?.replace('_', ' ') || 'Not specified'}
                                                </p>
                                            </div>
                                            {selectedInvoice.payment.paymentDate && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Date</p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {new Date(selectedInvoice.payment.paymentDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedInvoice.payment.receipt?.number && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Receipt Number</p>
                                                    <p className="text-sm font-mono font-bold text-gray-900">
                                                        {selectedInvoice.payment.receipt.number}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Invoice Preview Section */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                                    {/* <div className="bg-[#700E08] p-6 text-white relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-5">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
                                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -ml-24 -mb-24"></div>
                                        </div>
                                        <div className="relative flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="flex-shrink-0 w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center">
                                                    <Building className="h-8 w-8 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="text-2xl font-extrabold tracking-tight text-white">NovaKeys</h2>
                                                    <p className="text-sm text-white/90 font-medium mt-0.5">Real Estate Solutions</p>
                                                    {selectedInvoice.agency && (
                                                        <p className="text-xs text-white/80 mt-1.5">Agency: <span className="font-semibold text-white">{selectedInvoice.agency.name}</span></p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                                                    <p className="text-sm font-bold text-white tracking-wider">INVOICE</p>
                                                    <p className="text-xs text-white/90 mt-0.5 font-mono">
                                                        #{selectedInvoice._id?.slice(-8).toUpperCase() || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div> */}

                                    <div className="p-6 space-y-6">
                                        {/* Invoice Details */}
                                        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
                                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                    <p className="font-bold text-gray-900 text-sm">
                                                        {selectedInvoice.lead?.contact?.firstName || 'Customer'} {selectedInvoice.lead?.contact?.lastName || ''}
                                                    </p>
                                                    {selectedInvoice.lead?.contact?.email && (
                                                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {selectedInvoice.lead.contact.email}
                                                        </p>
                                                    )}
                                                    {selectedInvoice.lead?.contact?.phone && (
                                                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {selectedInvoice.lead.contact.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Invoice Details</p>
                                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                                                    <div className="flex justify-between text-xs gap-2">
                                                        <span className="text-gray-600 shrink-0">Invoice Date:</span>
                                                        <span className="font-bold text-gray-900 text-right">
                                                            {(selectedInvoice.paymentDetails?.paymentDate || selectedInvoice.payment?.paymentDate || selectedInvoice.transactionDate)
                                                                ? new Date(selectedInvoice.paymentDetails?.paymentDate || selectedInvoice.payment?.paymentDate || selectedInvoice.transactionDate).toLocaleDateString()
                                                                : '—'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-xs gap-2">
                                                        <span className="text-gray-600 shrink-0">Transaction Date:</span>
                                                        <span className="font-bold text-gray-900 text-right">
                                                            {selectedInvoice.transactionDate ? new Date(selectedInvoice.transactionDate).toLocaleDateString() : '—'}
                                                        </span>
                                                    </div>
                                                    {selectedInvoice.paymentDetails?.transactionReference && (
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-gray-600">Reference No:</span>
                                                            <span className="font-mono font-bold text-gray-900">
                                                                {selectedInvoice.paymentDetails.transactionReference}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div> */}

                                        {/* Property Details */}
                                        {/* <div className="border-t border-gray-200 pt-4">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Property Information</p>
                                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                <p className="font-bold text-gray-900 text-base mb-1">
                                                    {selectedInvoice.property?.title || 'Property'}
                                                </p>
                                                {selectedInvoice.property?.location && (
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {selectedInvoice.property.location.city || selectedInvoice.property.location.address || 'Location'}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-500 mt-2 capitalize">
                                                    Type: {selectedInvoice.type || 'sale'}
                                                </p>
                                            </div>
                                        </div> */}

                                        {/* Payment Summary Table */}
                                        <div className="border-t border-gray-200 pt-4">
                                            {/* <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Summary</p>
                                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                <table className="w-full table-fixed">
                                                    <colgroup>
                                                        <col className="w-[70%]" />
                                                        <col className="w-[30%]" />
                                                    </colgroup>
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
                                                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase w-32 min-w-[100px] whitespace-nowrap">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        <tr>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                <div>
                                                                    <p className="font-semibold">Property {selectedInvoice.type === 'sale' ? 'Sale' : 'Rent'}</p>
                                                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                                        {selectedInvoice.property?.title || 'Property Transaction'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 whitespace-nowrap">
                                                                {formatCurrency(selectedInvoice.amount, selectedInvoice.payment?.currency || selectedInvoice.currency || 'INR')}
                                                            </td>
                                                        </tr>
                                                        {selectedInvoice.paymentDetails && (
                                                            <>
                                                                <tr className="bg-emerald-50/60">
                                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                                        <div className="flex items-center gap-2">
                                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                                                            <span>Amount Paid</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 whitespace-nowrap">
                                                                        {formatCurrency(selectedInvoice.paymentDetails.amountPaid, selectedInvoice.payment?.currency || selectedInvoice.currency || 'INR')}
                                                                    </td>
                                                                </tr>
                                                                <tr className="bg-amber-50/60">
                                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                                        <div className="flex items-center gap-2">
                                                                            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                                                            <span>Due Amount</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm font-bold text-amber-800 whitespace-nowrap">
                                                                        {formatCurrency(selectedInvoice.paymentDetails.dueAmount ?? 0, selectedInvoice.payment?.currency || selectedInvoice.currency || 'INR')}
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        )}
                                                    </tbody>
                                                    <tfoot className="bg-[#700E08]/8 border-t-2 border-[#700E08]/20">
                                                        <tr>
                                                            <td className="px-4 py-4 text-sm font-extrabold text-gray-900 uppercase">Total Amount</td>
                                                            <td className="px-4 py-4 text-right text-lg font-extrabold text-[#700E08] whitespace-nowrap">
                                                                {formatCurrency(selectedInvoice.amount, selectedInvoice.payment?.currency || selectedInvoice.currency || 'INR')}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div> */}
                                        </div>

                                        {/* Payment Method & Notes */}
                                        {selectedInvoice.paymentDetails && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</p>
                                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4 text-gray-600" />
                                                            <p className="text-sm font-semibold text-gray-900 capitalize">
                                                                {selectedInvoice.paymentDetails.paymentMethod?.replace('_', ' ') || 'Not specified'}
                                                            </p>
                                                        </div>
                                                        {selectedInvoice.paymentDetails.paymentDate && (
                                                            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                Paid on: {new Date(selectedInvoice.paymentDetails.paymentDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {selectedInvoice.notes && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</p>
                                                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                            <p className="text-xs text-gray-700 leading-relaxed">{selectedInvoice.notes}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-center">
                                                <p className="text-xs text-gray-600 font-medium">
                                                    Thank you for your business!
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-2">
                                                    This is an auto-generated invoice. For any queries, please contact your agent or agency.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary-600" />
                                        Uploaded Documents
                                    </h3>

                                    {(() => {
                                        // Only show documents for THIS property - never show another property's documents
                                        const transactionPropertyId = (selectedInvoice.property?._id || selectedInvoice.property)?.toString?.() || selectedInvoice.property?.toString?.() || '';
                                        const leadPropertyId = (selectedInvoice.lead?.property?._id || selectedInvoice.lead?.property)?.toString?.() || selectedInvoice.lead?.property?.toString?.() || '';

                                        // Transaction's own documents are always for this transaction
                                        const transactionDocs = selectedInvoice.documents || [];
                                        // Lead's documents - only if lead is for the SAME property as this transaction
                                        const leadDocs = (transactionPropertyId && leadPropertyId && transactionPropertyId === leadPropertyId)
                                            ? (selectedInvoice.lead?.documents || [])
                                            : [];

                                        const allDocuments = [...transactionDocs, ...leadDocs];

                                        if (allDocuments.length > 0) {
                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {allDocuments.map((doc, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 transition-all group">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                    <FileText className="h-5 w-5 text-red-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-bold text-gray-900 truncate pr-2" title={doc.name}>
                                                                        {doc.name || 'Document'}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter mt-0.5">
                                                                        {doc.type || 'FILE'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {doc.url && (
                                                                    <a
                                                                        href={doc.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                                        title="View"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </a>
                                                                )}
                                                                {doc.url && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const link = document.createElement('a');
                                                                            link.href = doc.url;
                                                                            link.download = doc.name || 'document.pdf';
                                                                            document.body.appendChild(link);
                                                                            link.click();
                                                                            document.body.removeChild(link);
                                                                        }}
                                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                        title="Download"
                                                                    >
                                                                        <Download className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-100">
                                                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-sm text-gray-500">No documents have been uploaded for this transaction yet.</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end sticky bottom-0 z-10">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
