import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { AppContextType } from '../../components/layout/AppShell';
import {
  Search,
  Filter,
  CreditCard,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileText,
  Calendar,
  Building2
} from 'lucide-react';
import { Payment, Booking, Customer, Property, SystemSettings } from '../../lib/repository/types';
import { generatePaymentReceiptPDF } from '../../lib/services/pdfGenerator';
import { useToast } from '../../context/ToastContext';

type TabType = 'all' | 'recorded' | 'refunded';

export default function PaymentsList() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [payments, setPayments] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pRes, bRes, cRes, propRes, sData] = await Promise.all([
          repository.getAllPayments(propertyFilter || undefined),
          repository.getBookings(),
          repository.getCustomers(),
          repository.getProperties(),
          repository.getSettings()
        ]);
        setSettings(sData);

        const custMap = cRes.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
        const propMap = propRes.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});

        const enhancedBookings = bRes.reduce((acc: any, b: any) => {
          acc[b.id] = { ...b, customer: custMap[b.customer_id], property: propMap[b.property_id] };
          return acc;
        }, {});

        const mappedPayments = pRes
          .map((p: any) => ({
            ...p,
            booking: enhancedBookings[p.booking_id]
          }))
          .sort(
            (a: any, b: any) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          );

        setPayments(mappedPayments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyFilter]);

  // Tab & search filtering
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Search
      const q = search.toLowerCase().trim();
      const matches =
        !q ||
        p.payment_no?.toLowerCase().includes(q) ||
        p.booking?.booking_no?.toLowerCase().includes(q) ||
        p.booking?.customer?.name?.toLowerCase().includes(q) ||
        p.ref_id?.toLowerCase().includes(q) ||
        p.method?.toLowerCase().includes(q);

      if (!matches) return false;

      // 2. Tab
      if (activeTab === 'recorded') {
        if (p.status !== 'Recorded' && p.status !== 'Completed') return false;
      } else if (activeTab === 'refunded') {
        if (p.status !== 'Refunded') return false;
      }

      // 3. Method
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      return true;
    });
  }, [payments, search, activeTab, methodFilter]);

  // Totals
  const metrics = useMemo(() => {
    let collected = 0;
    let completedCount = 0;
    let refundedAmount = 0;
    let refundedCount = 0;

    payments.forEach((p) => {
      if (p.status === 'Recorded' || p.status === 'Completed') {
        collected += Number(p.amount) || 0;
        completedCount++;
      } else if (p.status === 'Refunded') {
        refundedAmount += Number(p.amount) || 0;
        refundedCount++;
      }
    });

    return { collected, completedCount, refundedAmount, refundedCount };
  }, [payments]);

  // Download PDF receipt
  async function handleDownloadReceipt(e: React.MouseEvent, p: any) {
    e.stopPropagation();
    if (!p.booking || !settings) return;
    try {
      const doc = await generatePaymentReceiptPDF(
        p.booking,
        p,
        p.booking.property,
        p.booking.customer,
        settings,
        0,
        0
      );
      doc.save(`${p.payment_no}.pdf`);
      toast.success('Receipt Downloaded', `${p.payment_no}.pdf saved.`);
    } catch (err) {
      toast.error('Failed to generate receipt');
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-white rounded-2xl border border-[#D8D2C5]"></div>
          ))}
        </div>
        <div className="h-96 bg-white rounded-2xl border border-[#D8D2C5]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Payments
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-1">
            Record and review payments across your bookings.
          </p>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 bg-white border-[#D8D2C5]">
          <span className="text-xs text-[#5C6E6B]">Net Collected</span>
          <div className="text-xl sm:text-2xl font-bold text-[#276749] mt-1">
            {fmtINR(metrics.collected)}
          </div>
        </div>
        <div className="card p-4 bg-white border-[#D8D2C5]">
          <span className="text-xs text-[#5C6E6B]">Completed Receipts</span>
          <div className="text-xl sm:text-2xl font-bold text-[#1A2B28] mt-1">
            {metrics.completedCount}
          </div>
        </div>
        <div className="card p-4 bg-white border-[#D8D2C5]">
          <span className="text-xs text-[#5C6E6B]">Refunds Processed</span>
          <div className="text-xl sm:text-2xl font-bold text-[#C45532] mt-1">
            {metrics.refundedCount}
          </div>
        </div>
        <div className="card p-4 bg-white border-[#D8D2C5]">
          <span className="text-xs text-[#5C6E6B]">Refunded Amount</span>
          <div className="text-xl sm:text-2xl font-bold text-[#C45532] mt-1">
            {fmtINR(metrics.refundedAmount)}
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#D8D2C5]">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-[#E8F3F1] text-[#0D5C56]'
                : 'text-[#5C6E6B] hover:bg-[#FAF9F6]'
            }`}
          >
            All ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('recorded')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'recorded'
                ? 'bg-[#E8F3F1] text-[#0D5C56]'
                : 'text-[#5C6E6B] hover:bg-[#FAF9F6]'
            }`}
          >
            Recorded ({metrics.completedCount})
          </button>
          <button
            onClick={() => setActiveTab('refunded')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'refunded'
                ? 'bg-[#E8F3F1] text-[#0D5C56]'
                : 'text-[#5C6E6B] hover:bg-[#FAF9F6]'
            }`}
          >
            Refunded ({metrics.refundedCount})
          </button>
        </div>

        {/* Search & Method */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C6E6B] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipts, guest, UTR..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-xl outline-none focus:border-[#0D5C56] text-[#1A2B28]"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-xl px-3 py-1.5 font-medium text-[#1A2B28] outline-none cursor-pointer"
          >
            <option value="all">All Methods</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden bg-white border-[#D8D2C5]">
        {filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#5C6E6B]">
            No payment records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EAE5DC] bg-[#FAF9F6] text-xs font-semibold text-[#5C6E6B] uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt / Code</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Guest & Stay</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Method & Ref</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DC]">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      if (p.booking_id) navigate(`/bookings/${p.booking_id}`);
                    }}
                    className="hover:bg-[#FAF9F6] cursor-pointer transition-colors group text-xs"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors">
                        {p.payment_no}
                      </div>
                      <div className="text-[11px] text-[#5C6E6B] font-mono">
                        {p.booking?.booking_no}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C6E6B] whitespace-nowrap">
                      {fmtDate(p.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1A2B28]">
                        {p.booking?.customer?.name || 'Guest'}
                      </div>
                      <div className="text-[11px] text-[#5C6E6B]">
                        {p.booking?.customer?.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C6E6B] max-w-[140px] truncate">
                      {p.booking?.property?.name || 'Property'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#1A2B28]">{p.method}</div>
                      {p.ref_id && (
                        <div className="text-[10px] text-[#5C6E6B] font-mono truncate max-w-[120px]">
                          Ref: {p.ref_id}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#5C6E6B]">{p.purpose}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-sm">
                      <span
                        className={p.status === 'Refunded' ? 'text-[#C45532]' : 'text-[#276749]'}
                      >
                        {p.status === 'Refunded' ? '-' : '+'}
                        {fmtINR(p.amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`badge ${
                          p.status === 'Refunded'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => handleDownloadReceipt(e, p)}
                        className="text-xs font-semibold text-[#0D5C56] hover:underline inline-flex items-center gap-1"
                        title="Download Receipt PDF"
                      >
                        <Download size={13} />
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
  );
}
