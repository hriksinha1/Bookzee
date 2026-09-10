import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Booking, Payment, Property, Customer, SystemSettings } from '../../lib/repository/types';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import AddPaymentModal from './AddPaymentModal';
import {
  generatePaymentReceiptPDF,
  generateBookingInvoicePDF
} from '../../lib/services/pdfGenerator';
import {
  ArrowLeft,
  Calendar,
  Building2,
  User,
  CreditCard,
  Download,
  Share2,
  FileText,
  CheckCircle2,
  LogIn,
  LogOut,
  AlertCircle,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [sharingModal, setSharingModal] = useState<{ open: boolean; channel: 'whatsapp' | 'email'; docName: string }>({
    open: false,
    channel: 'whatsapp',
    docName: ''
  });

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [bData, pData, sData, cData, propData] = await Promise.all([
        repository.getBooking(id as string),
        repository.getPayments(id as string),
        repository.getSettings(),
        repository.getCustomers(),
        repository.getProperties()
      ]);

      if (bData) {
        bData.customer = cData.find((c) => c.id === bData.customer_id);
        bData.property = propData.find((p) => p.id === bData.property_id);
      }
      setBooking(bData);
      setPayments(pData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setSettings(sData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  }

  // Financial calculations
  const financials = booking ? calculateBookingFinancials(booking, payments) : null;

  // Status updates
  async function handleUpdateStayStatus(newStatus: 'Confirmed' | 'Checked In' | 'Checked Out') {
    if (!booking) return;
    try {
      await repository.updateBooking(booking.id, { booking_status: newStatus });
      setBooking({ ...booking, booking_status: newStatus });
      toast.success('Stay Status Updated', `Booking is now marked as ${newStatus}.`);
    } catch (err) {
      toast.error('Could not update status');
    }
  }

  // Invoice download
  async function handleDownloadInvoice() {
    if (!booking || !settings) return;
    try {
      const doc = await generateBookingInvoicePDF(
        booking,
        payments,
        booking.property,
        booking.customer,
        settings,
        financials?.netPaid || 0,
        financials?.amountDue || 0
      );
      doc.save(`INV-${booking.booking_no}.pdf`);
      toast.success('Invoice Generated', `INV-${booking.booking_no}.pdf downloaded.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Tax Invoice');
    }
  }

  // Receipt download for individual payment
  async function handleDownloadReceipt(p: Payment, index: number) {
    if (!booking || !settings) return;
    try {
      let previouslyPaid = 0;
      for (let i = 0; i < index; i++) {
        if (payments[i].status === 'Completed' || payments[i].status === 'Recorded') {
          previouslyPaid += payments[i].amount;
        } else if (payments[i].status === 'Refunded') {
          previouslyPaid -= payments[i].amount;
        }
      }
      const balanceAfter = Math.max(
        0,
        booking.grand_total - (previouslyPaid + (p.status === 'Refunded' ? -p.amount : p.amount))
      );
      const doc = await generatePaymentReceiptPDF(
        booking,
        p,
        booking.property,
        booking.customer,
        settings,
        previouslyPaid,
        balanceAfter
      );
      doc.save(`${p.payment_no}.pdf`);
      toast.success('Receipt Downloaded', `${p.payment_no}.pdf saved.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate receipt');
    }
  }

  if (loading || !booking || !financials) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-[#D4DED9]"></div>
          <div className="h-96 bg-white rounded-2xl border border-[#D4DED9]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/bookings"
            className="p-2 rounded-xl border border-[#D4DED9] bg-white text-[#5F716E] hover:text-[#18312F] hover:bg-[#FAF8F5] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
                Stay Confirmation
              </span>
              <span className="text-xs font-mono font-bold bg-[#E6F3F1] text-[#0F766E] px-2 py-0.5 rounded-full border border-[#BDE4CD]">
                {booking.booking_no}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
              {booking.customer?.name}
            </h1>
          </div>
        </div>

        {/* Primary Contextual Action Button (Requirement #22) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {financials.amountDue > 0 ? (
            <button
              onClick={() => setShowPayModal(true)}
              className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 font-semibold shadow-sm"
            >
              <CreditCard size={16} />
              <span>Record Payment ({fmtINR(financials.amountDue)} due)</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EAF5EE] text-[#2F7D5A] border border-[#BDE4CD] text-xs font-semibold">
              <CheckCircle2 size={16} />
              <span>Paid in Full</span>
            </div>
          )}

          {/* Stay Status Progression */}
          {booking.booking_status === 'Confirmed' && (
            <button
              onClick={() => handleUpdateStayStatus('Checked In')}
              className="btn btn-outline text-xs sm:text-sm flex items-center gap-2 bg-white"
            >
              <LogIn size={15} className="text-[#0F766E]" />
              <span>Mark Checked In</span>
            </button>
          )}

          {booking.booking_status === 'Checked In' && (
            <button
              onClick={() => handleUpdateStayStatus('Checked Out')}
              className="btn btn-outline text-xs sm:text-sm flex items-center gap-2 bg-white text-[#C65D3A] border-[#F7C5C5] hover:bg-[#FBEFEA]"
            >
              <LogOut size={15} />
              <span>Complete Check-out</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Cols Left + 1 Col Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stay & Financial Source of Truth */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Stay Details Card */}
          <div className="card p-6 bg-white border-[#D4DED9] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8ECE9] pb-4">
              <div>
                <span className="text-xs font-semibold text-[#5F716E]">Property & Room</span>
                <h3 className="text-lg font-bold text-[#18312F] mt-0.5">
                  {booking.property?.name}
                </h3>
                <p className="text-xs text-[#5F716E]">{booking.property?.location}</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`badge ${
                    booking.booking_status === 'Checked In'
                      ? 'bg-[#EAF5EE] text-[#2F7D5A] border border-[#BDE4CD]'
                      : booking.booking_status === 'Checked Out'
                      ? 'bg-stone-100 text-stone-600 border border-stone-200'
                      : 'bg-[#E6F3F1] text-[#0F766E] border border-[#BDE4CD]'
                  }`}
                >
                  {booking.booking_status}
                </span>
                <span
                  className={`badge ${
                    financials.paymentStatus === 'Paid'
                      ? 'bg-[#EAF5EE] text-[#2F7D5A] border border-[#BDE4CD]'
                      : financials.paymentStatus === 'Partially Paid'
                      ? 'bg-[#FDF5E8] text-[#B7791F] border border-[#F6DBA9]'
                      : 'bg-[#FDF0F0] text-[#B84A4A] border border-[#F7C5C5]'
                  }`}
                >
                  {financials.paymentStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF8F5]">
                <div className="text-[#5F716E]">Check-in</div>
                <div className="font-semibold text-sm text-[#18312F] mt-1">
                  {fmtDate(booking.check_in)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5]">
                <div className="text-[#5F716E]">Check-out</div>
                <div className="font-semibold text-sm text-[#18312F] mt-1">
                  {fmtDate(booking.check_out)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5]">
                <div className="text-[#5F716E]">Duration</div>
                <div className="font-semibold text-sm text-[#18312F] mt-1">
                  {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5]">
                <div className="text-[#5F716E]">Occupancy</div>
                <div className="font-semibold text-sm text-[#18312F] mt-1">
                  {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'} ({booking.rooms} rm)
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="card p-6 bg-white border-[#D4DED9] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8ECE9] pb-3">
              <h3 className="text-base font-semibold text-[#18312F]">Financial Breakdown</h3>
              <span className="text-xs text-[#5F716E]">Tax Invoice Calculation</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-[#5F716E]">
                <span>Accommodation Charges ({booking.nights} nights @ {booking.room_type}):</span>
                <span className="font-medium text-[#18312F]">{fmtINR(booking.base_amount)}</span>
              </div>

              {booking.tax_enabled && (
                <div className="flex justify-between text-[#5F716E]">
                  <span>GST ({booking.tax_rate}%):</span>
                  <span className="font-medium text-[#18312F]">{fmtINR(booking.tax_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-[#18312F] pt-2 border-t border-[#E8ECE9]">
                <span>Total Booking Amount:</span>
                <span>{fmtINR(financials.bookingTotal)}</span>
              </div>

              <div className="flex justify-between text-xs text-[#2F7D5A] font-semibold pt-1">
                <span>Total Paid:</span>
                <span>{fmtINR(financials.netPaid)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#E8ECE9]">
                <span className="text-[#18312F]">Amount Due:</span>
                <span
                  className={financials.amountDue > 0 ? 'text-[#B7791F]' : 'text-[#2F7D5A]'}
                >
                  {fmtINR(financials.amountDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Ledger */}
          <div className="card p-6 bg-white border-[#D4DED9] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8ECE9] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[#18312F]">Payment History</h3>
                <p className="text-xs text-[#5F716E] mt-0.5">
                  {payments.length} transaction(s) recorded for this stay
                </p>
              </div>

              {financials.amountDue > 0 && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="btn btn-outline text-xs flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Add Payment</span>
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5F716E]">
                No payments have been recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E8ECE9] bg-[#FAF8F5] text-[#5F716E] font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Purpose</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Document</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECE9]">
                    {payments.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-[#18312F]">
                          {p.payment_no}
                          {p.ref_id && (
                            <div className="text-[10px] text-[#8B9B97]">Ref: {p.ref_id}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#5F716E]">{fmtDate(p.date)}</td>
                        <td className="py-3 px-3 text-[#18312F] font-medium">{p.method}</td>
                        <td className="py-3 px-3 text-[#5F716E]">{p.purpose}</td>
                        <td className="py-3 px-3 text-right font-bold text-[#18312F]">
                          {fmtINR(p.amount)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDownloadReceipt(p, idx)}
                            className="text-xs font-semibold text-[#0F766E] hover:underline inline-flex items-center gap-1"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Documents & Guest Profile */}
        <div className="space-y-6">
          {/* Official Hospitality Documents (Requirement #22) */}
          <div className="card p-5 bg-white border-[#D4DED9] space-y-4">
            <div className="border-b border-[#E8ECE9] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                Guest Documents
              </span>
              <h3 className="text-base font-bold text-[#18312F] mt-0.5">Invoices & Receipts</h3>
            </div>

            <div className="space-y-3">
              {/* Tax Invoice */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8ECE9] space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-xs text-[#18312F] flex items-center gap-1.5">
                      <FileText size={14} className="text-[#0F766E]" />
                      Tax Invoice
                    </div>
                    <div className="text-[11px] text-[#5F716E] mt-0.5">
                      GST-compliant stay invoice
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleDownloadInvoice}
                    className="btn btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 py-1.5"
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() =>
                      setSharingModal({
                        open: true,
                        channel: 'whatsapp',
                        docName: `Tax Invoice INV-${booking.booking_no}`
                      })
                    }
                    className="btn btn-outline text-xs p-1.5 bg-white"
                    title="Share via WhatsApp"
                  >
                    <Share2 size={13} />
                  </button>
                </div>
              </div>

              {/* Guest Sharing Options */}
              <div className="pt-2 text-xs text-[#5F716E] space-y-2">
                <div className="font-semibold text-[#18312F]">Quick Share</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setSharingModal({
                        open: true,
                        channel: 'whatsapp',
                        docName: `Booking Details ${booking.booking_no}`
                      })
                    }
                    className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#E6F3F1] border border-[#E8ECE9] text-[#18312F] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 size={13} className="text-[#2F7D5A]" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() =>
                      setSharingModal({
                        open: true,
                        channel: 'email',
                        docName: `Stay Voucher ${booking.booking_no}`
                      })
                    }
                    className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#E6F3F1] border border-[#E8ECE9] text-[#18312F] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Mail size={13} className="text-[#0F766E]" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Profile Details */}
          <div className="card p-5 bg-white border-[#D4DED9] space-y-4">
            <div className="border-b border-[#E8ECE9] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                Guest Profile
              </span>
              <h3 className="text-base font-bold text-[#18312F] mt-0.5">
                {booking.customer?.name}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-[#5F716E]">
                <Phone size={14} className="text-[#0F766E]" />
                <span className="text-[#18312F] font-medium">
                  {booking.customer?.phone || 'No phone recorded'}
                </span>
              </div>

              {booking.customer?.email && (
                <div className="flex items-center gap-2 text-[#5F716E]">
                  <Mail size={14} className="text-[#0F766E]" />
                  <span className="text-[#18312F] font-medium">{booking.customer.email}</span>
                </div>
              )}

              {booking.customer?.id_type && (
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8ECE9] space-y-1">
                  <div className="text-[11px] text-[#5F716E]">Government Identity Verification:</div>
                  <div className="font-semibold text-[#18312F]">
                    {booking.customer.id_type}: {booking.customer.id_number}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      {showPayModal && (
        <AddPaymentModal
          booking={booking}
          balanceDue={financials.amountDue}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => {
            load();
          }}
        />
      )}

      {/* Demo Sharing Confirmation Dialog */}
      {sharingModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
          onClick={() => setSharingModal({ ...sharingModal, open: false })}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#D4DED9] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#E6F3F1] text-[#0F766E] flex items-center justify-center">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#18312F]">
                  Share via {sharingModal.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </h3>
                <p className="text-xs text-[#5F716E]">{sharingModal.docName}</p>
              </div>
            </div>

            <p className="text-xs text-[#18312F] bg-[#FAF8F5] p-3 rounded-xl border border-[#E8ECE9]">
              {sharingModal.channel === 'whatsapp'
                ? `Guest voucher link will be sent to WhatsApp number: ${
                    booking.customer?.phone || '+91 98765 43210'
                  }`
                : `Invoice document will be emailed to: ${
                    booking.customer?.email || 'guest@example.com'
                  }`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSharingModal({ ...sharingModal, open: false })}
                className="btn btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success(
                    'Shared Successfully',
                    `Document sent to ${booking.customer?.name} via ${sharingModal.channel}.`
                  );
                  setSharingModal({ ...sharingModal, open: false });
                }}
                className="btn btn-primary text-xs"
              >
                Confirm Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
