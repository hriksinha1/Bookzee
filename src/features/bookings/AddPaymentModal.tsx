import React, { useState, useEffect } from 'react';
import { repository } from '../../lib/repository';
import { fmtINR } from '../../lib/utils/formatters';
import { generatePaymentReceiptPDF } from '../../lib/services/pdfGenerator';
import {
  X,
  CheckCircle2,
  Download,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  Share2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function AddPaymentModal({
  booking,
  balanceDue,
  onClose,
  onSuccess
}: {
  booking: any;
  balanceDue: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number | ''>(balanceDue);
  const [method, setMethod] = useState('UPI');
  const [refId, setRefId] = useState('');
  const [purpose, setPurpose] = useState('Advance deposit');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [previouslyPaid, setPreviouslyPaid] = useState<number>(0);

  useEffect(() => {
    repository.getSettings().then(setSettings);
    repository.getPayments(booking.id).then((payments) => {
      const total = payments.reduce((sum, p) => {
        if (p.status === 'Completed' || p.status === 'Recorded') return sum + Number(p.amount);
        if (p.status === 'Refunded') return sum - Number(p.amount);
        return sum;
      }, 0);
      setPreviouslyPaid(total);
    });
  }, [booking.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const numAmount = Number(amount);
      if (numAmount <= 0) throw new Error('Enter a payment amount greater than ₹0.');
      if (numAmount > balanceDue) {
        throw new Error(`Maximum payable amount is ${fmtINR(balanceDue)}.`);
      }

      const payment = await repository.createPayment({
        payment_no: `PAY-${Math.floor(8000 + Math.random() * 2000)}`,
        booking_id: booking.id,
        date,
        amount: numAmount,
        method,
        purpose,
        ref_id: refId.trim() || undefined,
        status: 'Recorded'
      });

      const newBalance = Math.max(0, balanceDue - numAmount);
      const paymentStatus = newBalance <= 0 ? 'Paid' : 'Partially Paid';

      await repository.updateBooking(booking.id, { payment_status: paymentStatus });

      setSuccessData({ payment, numAmount, newBalance });
      toast.success(
        'Payment Recorded',
        newBalance <= 0 ? 'Booking is now fully settled.' : `${fmtINR(newBalance)} remaining due.`
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!successData || !settings) return;
    try {
      const doc = await generatePaymentReceiptPDF(
        booking,
        successData.payment,
        booking.property,
        booking.customer,
        settings,
        previouslyPaid,
        successData.newBalance
      );
      doc.save(`${successData.payment.payment_no}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate receipt PDF');
    }
  }

  if (successData) {
    return (
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#EBF6EF] text-[#276749] flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-[#1A2B28]">Payment Recorded</h2>
            <p className="text-xs text-[#5C6E6B]">
              {successData.newBalance > 0
                ? `${fmtINR(successData.newBalance)} remaining due on this booking.`
                : 'This reservation is now fully settled and paid in full.'}
            </p>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] space-y-1.5 text-xs my-3 text-left">
              <div className="flex justify-between">
                <span className="text-[#5C6E6B]">Receipt Number:</span>
                <span className="font-mono font-semibold text-[#1A2B28]">
                  {successData.payment.payment_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6E6B]">Amount Received:</span>
                <span className="font-bold text-sm text-[#276749]">
                  {fmtINR(successData.numAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6E6B]">Method:</span>
                <span className="text-[#1A2B28]">{successData.payment.method}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#EAE5DC]">
                <span className="text-[#5C6E6B]">Remaining Due:</span>
                <span
                  className={`font-semibold ${
                    successData.newBalance > 0 ? 'text-[#C45532]' : 'text-[#276749]'
                  }`}
                >
                  {fmtINR(successData.newBalance)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleDownloadPDF}
                className="btn btn-outline text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>Download Receipt PDF</span>
              </button>
              <button
                onClick={onClose}
                className="btn btn-primary text-xs flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE5DC] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#0D5C56]">
              Settlement
            </div>
            <h3 className="text-base font-bold text-[#1A2B28]">Record Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-[#1A2B28] hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Balance Summary Banner */}
        <div className="p-4 bg-[#E8F3F1] border-b border-[#BDDFC9] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#0D5C56] font-medium">Guest: {booking.customer?.name}</div>
            <div className="text-[11px] text-[#5C6E6B]">{booking.booking_no} • {booking.property?.name}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[#5C6E6B]">Outstanding Due</div>
            <div className="text-lg font-bold text-[#1A2B28]">{fmtINR(balanceDue)}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1A2B28]">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(balanceDue)}
                className="text-xs font-semibold text-[#0D5C56] hover:underline"
              >
                Pay Full Balance ({fmtINR(balanceDue)})
              </button>
            </div>
            <input
              type="number"
              required
              min={1}
              max={balanceDue}
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="input text-base font-bold text-[#1A2B28]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="select text-xs"
              >
                <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Payment Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="select text-xs"
              >
                <option value="Advance deposit">Advance deposit</option>
                <option value="Check-in payment">Check-in payment</option>
                <option value="Settlement at check-out">Settlement at check-out</option>
                <option value="In-stay room charge">In-stay room charge</option>
                <option value="Food & Beverage">Food & Beverage</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Transaction Ref / UTR (Optional)
              </label>
              <input
                type="text"
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                placeholder="e.g. UPI Ref #482910"
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2B28] mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EAE5DC]">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary text-xs px-5 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CreditCard size={14} />
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
