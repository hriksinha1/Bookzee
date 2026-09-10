import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import { AppContextType } from '../../components/layout/AppShell';
import {
  Search,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  Send,
  CheckCircle2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Booking, Payment, Customer, Property } from '../../lib/repository/types';
import AddPaymentModal from '../bookings/AddPaymentModal';
import { useToast } from '../../context/ToastContext';

type PriorityTab = 'all' | 'in-house' | 'departed' | 'upcoming';

export default function OutstandingPayments() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<PriorityTab>('all');
  const [selectedBookingToPay, setSelectedBookingToPay] = useState<{
    booking: Booking;
    due: number;
  } | null>(null);

  useEffect(() => {
    load();
  }, [propertyFilter]);

  async function load() {
    setLoading(true);
    try {
      const [bRes, pRes, cRes, propRes] = await Promise.all([
        repository.getBookings(propertyFilter || undefined),
        repository.getAllPayments(propertyFilter || undefined),
        repository.getCustomers(),
        repository.getProperties()
      ]);

      const custMap = cRes.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {});
      const propMap = propRes.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});

      const enhanced = bRes.map((b) => ({
        ...b,
        customer: custMap[b.customer_id],
        property: propMap[b.property_id]
      }));

      setBookings(enhanced);
      setPayments(pRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Map payments by booking ID
  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, Payment[]>();
    payments.forEach((p) => {
      const list = map.get(p.booking_id) || [];
      list.push(p);
      map.set(p.booking_id, list);
    });
    return map;
  }, [payments]);

  // Derive outstanding bookings
  const outstandingList = useMemo(() => {
    return bookings
      .filter((b) => b.booking_status !== 'Cancelled')
      .map((b) => {
        const bPayments = paymentsByBooking.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPayments);

        // Classify stay lifecycle category
        let category: 'in-house' | 'departed' | 'upcoming' = 'upcoming';
        if (b.booking_status === 'Checked Out' || b.check_out < todayStr) {
          category = 'departed';
        } else if (
          b.booking_status === 'Checked In' ||
          (b.check_in <= todayStr && b.check_out >= todayStr)
        ) {
          category = 'in-house';
        }

        return {
          booking: b,
          financials: fin,
          category,
          due: fin.amountDue,
          lastPaymentDate:
            bPayments.length > 0
              ? bPayments.sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                )[0].date
              : null
        };
      })
      .filter((item) => item.due > 0)
      .sort((a, b) => {
        // Departed guests with due are highest priority
        if (a.category === 'departed' && b.category !== 'departed') return -1;
        if (b.category === 'departed' && a.category !== 'departed') return 1;
        return b.due - a.due;
      });
  }, [bookings, paymentsByBooking, todayStr]);

  // Tab & search filtering
  const filteredOutstanding = useMemo(() => {
    return outstandingList.filter((item) => {
      // 1. Search
      const q = search.toLowerCase().trim();
      const b = item.booking;
      const matches =
        !q ||
        b.booking_no.toLowerCase().includes(q) ||
        b.customer?.name.toLowerCase().includes(q) ||
        b.customer?.phone.toLowerCase().includes(q) ||
        b.property?.name.toLowerCase().includes(q);

      if (!matches) return false;

      // 2. Tab
      if (activeTab !== 'all' && item.category !== activeTab) return false;

      return true;
    });
  }, [outstandingList, search, activeTab]);

  // Summary Metrics (Requirement #24)
  const metrics = useMemo(() => {
    let totalDue = 0;
    let highPriorityCount = 0; // departed or in-house
    let departedDue = 0;

    outstandingList.forEach((item) => {
      totalDue += item.due;
      if (item.category === 'departed') {
        highPriorityCount++;
        departedDue += item.due;
      } else if (item.category === 'in-house') {
        highPriorityCount++;
      }
    });

    return {
      totalDue,
      count: outstandingList.length,
      highPriorityCount,
      departedDue
    };
  }, [outstandingList]);

  // Send polite reminder
  async function handleSendReminder(e: React.MouseEvent, item: any) {
    e.stopPropagation();
    try {
      await repository.createNotification({
        booking_id: item.booking.id,
        customer_id: item.booking.customer_id,
        channel: 'Email',
        type: 'Payment Reminder',
        recipient: item.booking.customer?.email || item.booking.customer?.phone || 'Guest',
        status: 'Demo Sent'
      });
      toast.success(
        'Reminder Sent',
        `Payment follow-up sent to ${item.booking.customer?.name} for ${fmtINR(item.due)}.`
      );
    } catch (err) {
      toast.error('Could not send reminder');
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-white rounded-2xl border border-[#D4DED9]"></div>
          ))}
        </div>
        <div className="h-96 bg-white rounded-2xl border border-[#D4DED9]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B7791F]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B7791F]">
              Cashflow Protection
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
            Outstanding Payments
          </h1>
          <p className="text-sm text-[#5F716E] mt-0.5">
            Track guest balances that require follow-up, advance collection, or check-out clearance.
          </p>
        </div>
      </div>

      {/* Summary Cards (Requirement #24) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-white border-l-4 border-l-[#B7791F]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
            Total Outstanding
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#18312F] mt-1 tracking-tight">
            {fmtINR(metrics.totalDue)}
          </div>
          <div className="text-xs text-[#5F716E] mt-1">Across all uncollected reservations</div>
        </div>

        <div className="card p-5 bg-white border-l-4 border-l-[#0F766E]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
            Bookings with Balance
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#18312F] mt-1 tracking-tight">
            {metrics.count}
          </div>
          <div className="text-xs text-[#5F716E] mt-1">Active stays requiring settlement</div>
        </div>

        <div className="card p-5 bg-white border-l-4 border-l-[#C65D3A]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C65D3A]">
            High Priority / Past Due
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#C65D3A] mt-1 tracking-tight">
            {metrics.highPriorityCount}
          </div>
          <div className="text-xs text-[#5F716E] mt-1">
            Checked-out or in-house ({fmtINR(metrics.departedDue)} post-stay)
          </div>
        </div>
      </div>

      {/* Priority Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#D4DED9]">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[#E6F3F1] text-[#0F766E]'
                : 'text-[#5F716E] hover:bg-[#FAF8F5]'
            }`}
          >
            All Outstanding ({outstandingList.length})
          </button>
          <button
            onClick={() => setActiveTab('departed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'departed'
                ? 'bg-[#FBEFEA] text-[#C65D3A]'
                : 'text-[#5F716E] hover:bg-[#FAF8F5]'
            }`}
          >
            Departed / Past Due (
            {outstandingList.filter((i) => i.category === 'departed').length})
          </button>
          <button
            onClick={() => setActiveTab('in-house')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'in-house'
                ? 'bg-[#EAF5EE] text-[#2F7D5A]'
                : 'text-[#5F716E] hover:bg-[#FAF8F5]'
            }`}
          >
            In-House Stays ({outstandingList.filter((i) => i.category === 'in-house').length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-[#FAF8F5] text-[#18312F]'
                : 'text-[#5F716E] hover:bg-[#FAF8F5]'
            }`}
          >
            Upcoming Stays ({outstandingList.filter((i) => i.category === 'upcoming').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9B97] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, code, phone..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E8ECE9] rounded-xl outline-none focus:border-[#0F766E] text-[#18312F]"
          />
        </div>
      </div>

      {/* List / Table */}
      <div className="card overflow-hidden bg-white border-[#D4DED9]">
        {filteredOutstanding.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#EAF5EE] text-[#2F7D5A] flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-semibold text-base text-[#18312F]">No balances found</h3>
            <p className="text-xs text-[#5F716E]">
              All guest bookings in this view are settled and paid in full.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E8ECE9] bg-[#FAF8F5] text-xs font-semibold text-[#5F716E] uppercase tracking-wider">
                  <th className="py-3 px-4">Guest & Code</th>
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Stay Dates</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4 text-right">Booking Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECE9]">
                {filteredOutstanding.map((item) => {
                  const b = item.booking;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/bookings/${b.id}`)}
                      className="hover:bg-[#FAF8F5] cursor-pointer transition-colors group text-xs"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#18312F] group-hover:text-[#0F766E] transition-colors">
                          {b.customer?.name || 'Guest'}
                        </div>
                        <div className="text-[11px] text-[#8B9B97] font-mono">{b.booking_no}</div>
                      </td>

                      <td className="py-3.5 px-4 text-[#5F716E] max-w-[140px] truncate">
                        {b.property?.name}
                      </td>

                      <td className="py-3.5 px-4 text-[#18312F]">
                        <div>
                          {fmtDate(b.check_in)} – {fmtDate(b.check_out)}
                        </div>
                        <div className="text-[11px] text-[#8B9B97]">{b.nights} night(s)</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.category === 'departed' ? (
                          <span className="badge bg-[#FBEFEA] text-[#C65D3A] border border-[#F7C5C5] font-semibold">
                            Departed (Urgent)
                          </span>
                        ) : item.category === 'in-house' ? (
                          <span className="badge bg-[#EAF5EE] text-[#2F7D5A] border border-[#BDE4CD]">
                            In-House Stay
                          </span>
                        ) : (
                          <span className="badge bg-[#FAF8F5] text-[#5F716E] border border-[#D4DED9]">
                            Upcoming Arrival
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#18312F]">
                        {fmtINR(item.financials.bookingTotal)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#2F7D5A] font-medium">
                        {fmtINR(item.financials.netPaid)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-sm text-[#B7791F]">
                          {fmtINR(item.due)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleSendReminder(e, item)}
                            className="p-1.5 rounded-lg border border-[#D4DED9] text-[#5F716E] hover:text-[#0F766E] hover:bg-white transition-colors"
                            title="Send Follow-up Reminder"
                          >
                            <Send size={13} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBookingToPay({ booking: b, due: item.due });
                            }}
                            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                          >
                            <CreditCard size={13} />
                            <span>Record Payment</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct Payment Recording Modal */}
      {selectedBookingToPay && (
        <AddPaymentModal
          booking={selectedBookingToPay.booking}
          balanceDue={selectedBookingToPay.due}
          onClose={() => setSelectedBookingToPay(null)}
          onSuccess={() => {
            setSelectedBookingToPay(null);
            load();
          }}
        />
      )}
    </div>
  );
}
