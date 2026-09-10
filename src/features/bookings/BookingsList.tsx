import React, { useEffect, useState, useMemo } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  CalendarDays,
  CreditCard,
  Building2,
  ArrowRight,
  Filter,
  User,
  Clock,
  Sparkles,
  Calendar
} from 'lucide-react';
import { repository } from '../../lib/repository';
import { Booking, Payment, Customer, Property } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';

type QuickTab = 'all' | 'arriving' | 'staying' | 'departing' | 'completed';

export default function BookingsList() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<QuickTab>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [bRes, pRes] = await Promise.all([
          repository.getBookings(propertyFilter || undefined),
          repository.getAllPayments(propertyFilter || undefined)
        ]);
        setBookings(bRes);
        setPayments(pRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyFilter]);

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

  // Tab & search filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Search filter
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.booking_no.toLowerCase().includes(q) ||
        b.customer?.name.toLowerCase().includes(q) ||
        b.customer?.phone.includes(q) ||
        b.room_type.toLowerCase().includes(q) ||
        b.property?.name.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Tab filter
      if (activeTab === 'arriving') {
        if (b.check_in !== todayStr || b.booking_status === 'Cancelled') return false;
      } else if (activeTab === 'departing') {
        if (b.check_out !== todayStr || b.booking_status === 'Cancelled') return false;
      } else if (activeTab === 'staying') {
        const isStaying =
          b.booking_status === 'Checked In' ||
          (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled');
        if (!isStaying) return false;
      } else if (activeTab === 'completed') {
        if (b.booking_status !== 'Checked Out' && b.booking_status !== 'Completed') return false;
      }

      // 3. Payment filter
      if (paymentFilter !== 'all') {
        const bPayments = paymentsByBooking.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPayments);
        if (fin.paymentStatus !== paymentFilter) return false;
      }

      return true;
    });
  }, [bookings, search, activeTab, paymentFilter, todayStr, paymentsByBooking]);

  const counts = useMemo(() => {
    return {
      all: bookings.length,
      arriving: bookings.filter((b) => b.check_in === todayStr && b.booking_status !== 'Cancelled')
        .length,
      staying: bookings.filter(
        (b) =>
          b.booking_status === 'Checked In' ||
          (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled')
      ).length,
      departing: bookings.filter(
        (b) => b.check_out === todayStr && b.booking_status !== 'Cancelled'
      ).length,
      completed: bookings.filter(
        (b) => b.booking_status === 'Checked Out' || b.booking_status === 'Completed'
      ).length
    };
  }, [bookings, todayStr]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="h-12 bg-white rounded-2xl border border-[#D8D2C5]"></div>
        <div className="h-96 bg-white rounded-2xl border border-[#D8D2C5]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0D5C56]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
              Guest Reservations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] mt-1 tracking-tight">
            Bookings
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-0.5">
            Manage stays, guests, arrivals, departures, and balance settlements.
          </p>
        </div>

        <Link
          to="/bookings/new"
          className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Booking</span>
        </Link>
      </div>

      {/* Quick Operational Tabs (Requirements 10, 11) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium border-b border-[#D8D2C5]">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold shadow-2xs border border-[#BDDFC9]'
              : 'text-[#5C6E6B] hover:bg-white'
          }`}
        >
          All Stays ({counts.all})
        </button>
        <button
          onClick={() => setActiveTab('arriving')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'arriving'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold shadow-2xs border border-[#BDDFC9]'
              : 'text-[#5C6E6B] hover:bg-white'
          }`}
        >
          Arriving Today ({counts.arriving})
        </button>
        <button
          onClick={() => setActiveTab('staying')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'staying'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold shadow-2xs border border-[#BDDFC9]'
              : 'text-[#5C6E6B] hover:bg-white'
          }`}
        >
          In-House ({counts.staying})
        </button>
        <button
          onClick={() => setActiveTab('departing')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'departing'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold shadow-2xs border border-[#BDDFC9]'
              : 'text-[#5C6E6B] hover:bg-white'
          }`}
        >
          Departing Today ({counts.departing})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-[#E8F3F1] text-[#0D5C56] font-bold shadow-2xs border border-[#BDDFC9]'
              : 'text-[#5C6E6B] hover:bg-white'
          }`}
        >
          Past Stays ({counts.completed})
        </button>
      </div>

      {/* Search & Secondary Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#D8D2C5]">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C6E6B] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, phone, booking ID, room type..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[#FAF9F6] border border-[#EAE5DC] rounded-xl outline-none focus:border-[#0D5C56] text-[#1A2B28] placeholder:text-[#5C6E6B]"
          />
        </div>

        {/* Payment status filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-[#5C6E6B] flex items-center gap-1">
            <Filter size={13} /> Payment:
          </span>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs bg-[#FAF9F6] border border-[#EAE5DC] rounded-xl px-3 py-1.5 font-medium text-[#1A2B28] outline-none cursor-pointer focus:border-[#0D5C56]"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid in Full</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Bookings View: Desktop Table + Mobile Cards */}
      <div className="card overflow-hidden bg-white border-[#D8D2C5]">
        {filteredBookings.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F3F1] text-[#0D5C56] mx-auto flex items-center justify-center">
              <CalendarDays size={24} />
            </div>
            <h3 className="text-base font-semibold text-[#1A2B28]">No bookings match your filter</h3>
            <p className="text-xs text-[#5C6E6B] max-w-sm mx-auto">
              Create a new guest booking to start tracking arrivals, departures, and balance
              settlements.
            </p>
            <Link to="/bookings/new" className="btn btn-primary text-xs inline-flex gap-2">
              <Plus size={14} /> Create Booking
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#EAE5DC] bg-[#FAF9F6] text-xs font-semibold text-[#5C6E6B] uppercase tracking-wider">
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Stay Dates</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Due</th>
                    <th className="py-3 px-4 text-center">Stay</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5DC]">
                  {filteredBookings.map((b) => {
                    const bPayments = paymentsByBooking.get(b.id) || [];
                    const fin = calculateBookingFinancials(b, bPayments);

                    return (
                      <tr
                        key={b.id}
                        onClick={() => navigate(`/bookings/${b.id}`)}
                        className="hover:bg-[#FAF9F6] cursor-pointer transition-colors group"
                      >
                        {/* Guest */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors">
                            {b.customer?.name || 'Guest'}
                          </div>
                          <div className="text-xs text-[#5C6E6B] font-mono">{b.booking_no}</div>
                        </td>

                        {/* Property */}
                        <td className="py-3.5 px-4 text-xs text-[#5C6E6B]">
                          <div className="font-medium text-[#1A2B28] truncate max-w-[160px]">
                            {b.property?.name}
                          </div>
                          <div className="text-[11px] text-[#5C6E6B]">{b.room_type}</div>
                        </td>

                        {/* Stay Dates */}
                        <td className="py-3.5 px-4 text-xs text-[#1A2B28]">
                          <div>
                            {fmtDate(b.check_in)} – {fmtDate(b.check_out)}
                          </div>
                          <div className="text-[11px] text-[#5C6E6B]">
                            {b.nights} {b.nights === 1 ? 'night' : 'nights'} • {b.guests} guests
                          </div>
                        </td>

                        {/* Financials */}
                        <td className="py-3.5 px-4 text-right font-semibold text-[#1A2B28] text-xs">
                          {fmtINR(fin.bookingTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#276749] text-xs">
                          {fmtINR(fin.netPaid)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs">
                          {fin.amountDue > 0 ? (
                            <span className="font-semibold text-[#C45532]">
                              {fmtINR(fin.amountDue)}
                            </span>
                          ) : (
                            <span className="text-[#276749] font-medium">₹0</span>
                          )}
                        </td>

                        {/* Stay Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`badge ${
                              b.booking_status === 'Checked In'
                                ? 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                                : b.booking_status === 'Checked Out'
                                ? 'bg-stone-100 text-stone-600 border border-stone-200'
                                : 'bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]'
                            }`}
                          >
                            {b.booking_status}
                          </span>
                        </td>

                        {/* Payment Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`badge ${
                              fin.paymentStatus === 'Paid'
                                ? 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                                : fin.paymentStatus === 'Partially Paid'
                                ? 'bg-[#FAF0EB] text-[#C45532] border border-[#F5DCAD]'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {fin.paymentStatus}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button className="text-xs font-semibold text-[#0D5C56] group-hover:underline inline-flex items-center gap-1">
                            <span>Details</span>
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-[#EAE5DC]">
              {filteredBookings.map((b) => {
                const bPayments = paymentsByBooking.get(b.id) || [];
                const fin = calculateBookingFinancials(b, bPayments);

                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="p-4 space-y-2.5 active:bg-[#FAF9F6] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[#1A2B28] text-base">
                          {b.customer?.name || 'Guest'}
                        </div>
                        <div className="text-xs text-[#5C6E6B] font-mono">{b.booking_no}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`badge ${
                            b.booking_status === 'Checked In'
                              ? 'bg-[#EBF6EF] text-[#276749]'
                              : 'bg-[#E8F3F1] text-[#0D5C56]'
                          }`}
                        >
                          {b.booking_status}
                        </span>
                        <span
                          className={`badge ${
                            fin.paymentStatus === 'Paid'
                              ? 'bg-[#EBF6EF] text-[#276749]'
                              : 'bg-[#FAF0EB] text-[#C45532]'
                          }`}
                        >
                          {fin.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[#5C6E6B]">
                      {b.property?.name} • {b.room_type}
                    </div>

                    <div className="text-xs text-[#1A2B28] flex items-center justify-between pt-2 border-t border-[#EAE5DC]">
                      <div>
                        {fmtDate(b.check_in)} – {fmtDate(b.check_out)}
                        <span className="text-[#5C6E6B] ml-1">({b.nights}n)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{fmtINR(fin.bookingTotal)}</span>
                        {fin.amountDue > 0 && (
                          <div className="text-[11px] text-[#C45532] font-semibold">
                            Due: {fmtINR(fin.amountDue)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
