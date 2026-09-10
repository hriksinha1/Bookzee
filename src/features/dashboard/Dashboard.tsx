import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  BedDouble,
  AlertCircle,
  Calendar,
  CreditCard,
  Building2,
  ArrowRight,
  Clock,
  CheckCircle2,
  Plus,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { repository } from '../../lib/repository';
import { Booking, Payment, Customer, Property } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtINR, fmtDate } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import { useToast } from '../../context/ToastContext';
import AddPaymentModal from '../bookings/AddPaymentModal';

export default function Dashboard() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState<{ booking: Booking; balanceDue: number } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      repository.getBookings(propertyFilter || undefined),
      repository.getAllPayments(propertyFilter || undefined),
      repository.getProperties(),
      repository.getCustomers()
    ]).then(([bList, pList, propList, custList]) => {
      setBookings(bList);
      setPayments(pList);
      setProperties(propList);
      setCustomers(custList);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [propertyFilter]);

  const activeProperty = properties.find((p) => p.id === propertyFilter);
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

  // Operational metrics
  const operations = useMemo(() => {
    // 1. Arrivals today
    const arrivalsToday = bookings.filter(
      (b) => b.check_in === todayStr && b.booking_status !== 'Cancelled'
    );

    // 2. Departures today
    const departuresToday = bookings.filter(
      (b) => b.check_out === todayStr && b.booking_status !== 'Cancelled'
    );

    // 3. In-house stays
    const inHouse = bookings.filter(
      (b) =>
        b.booking_status === 'Checked In' ||
        (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled')
    );

    // 4. Financial totals calculated strictly from calculateBookingFinancials
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    bookings.forEach((b) => {
      if (b.booking_status !== 'Cancelled') {
        const bPayments = paymentsByBooking.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPayments);
        totalRevenue += fin.bookingTotal;
        totalCollected += fin.netPaid;
        totalOutstanding += fin.amountDue;
      }
    });

    return {
      arrivalsToday,
      departuresToday,
      inHouse,
      totalRevenue,
      totalCollected,
      totalOutstanding,
      totalBookings: bookings.filter((b) => b.booking_status !== 'Cancelled').length
    };
  }, [bookings, paymentsByBooking, todayStr]);

  // Actionable payment attention exceptions (Section 14)
  const needsAttention = useMemo(() => {
    const items: Array<{
      booking: Booking;
      guestName: string;
      propertyName: string;
      dueAmount: number;
      reason: string;
      isTodayCheckout: boolean;
    }> = [];

    bookings.forEach((b) => {
      if (b.booking_status === 'Cancelled') return;
      const bPayments = paymentsByBooking.get(b.id) || [];
      const fin = calculateBookingFinancials(b, bPayments);

      if (fin.amountDue > 0) {
        if (b.check_out === todayStr) {
          items.push({
            booking: b,
            guestName: b.customer?.name || 'Guest',
            propertyName: b.property?.name || 'Property',
            dueAmount: fin.amountDue,
            reason: 'Checkout today with unpaid balance',
            isTodayCheckout: true
          });
        } else if (b.check_in === todayStr && fin.paid === 0) {
          items.push({
            booking: b,
            guestName: b.customer?.name || 'Guest',
            propertyName: b.property?.name || 'Property',
            dueAmount: fin.amountDue,
            reason: 'Arrival today without deposit',
            isTodayCheckout: false
          });
        }
      }
    });

    return items;
  }, [bookings, paymentsByBooking, todayStr]);

  // Handle Quick Check-in
  const handleQuickCheckIn = async (b: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repository.updateBooking(b.id, { booking_status: 'Checked In' });
      toast.success('Guest Checked In', `${b.customer?.name || 'Guest'} marked as checked in.`);
      loadData();
    } catch {
      toast.error('Check-in Failed', 'Could not update booking status.');
    }
  };

  // Handle Quick Check-out
  const handleQuickCheckOut = async (b: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repository.updateBooking(b.id, { booking_status: 'Checked Out' });
      toast.success('Guest Checked Out', `${b.customer?.name || 'Guest'} marked as checked out.`);
      loadData();
    } catch {
      toast.error('Check-out Failed', 'Could not update booking status.');
    }
  };

  // Real chart data aggregated from bookings across recent months
  const chartData = useMemo(() => {
    const monthsMap: Record<string, { month: string; revenue: number; collected: number }> = {};

    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-US', { month: 'short' });
      monthsMap[key] = { month: key, revenue: 0, collected: 0 };
    }

    bookings.forEach((b) => {
      if (b.created_at && b.booking_status !== 'Cancelled') {
        const d = new Date(b.created_at);
        const mKey = d.toLocaleString('en-US', { month: 'short' });
        if (monthsMap[mKey]) {
          monthsMap[mKey].revenue += b.grand_total || 0;
        }
      }
    });

    payments.forEach((p) => {
      if (p.date && (p.status === 'Recorded' || p.status === 'Completed')) {
        const d = new Date(p.date);
        const mKey = d.toLocaleString('en-US', { month: 'short' });
        if (monthsMap[mKey]) {
          monthsMap[mKey].collected += p.amount || 0;
        }
      }
    });

    return Object.values(monthsMap);
  }, [bookings, payments]);

  // Operational Activity Stream
  const activityFeed = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      subtitle: string;
      time: string;
      type: 'payment' | 'booking' | 'refund';
      amount?: number;
    }> = [];

    payments.slice(0, 4).forEach((p) => {
      if (p.status === 'Refunded') {
        events.push({
          id: p.id,
          title: `Refund processed (${p.method})`,
          subtitle: `Ref: ${p.ref_id || 'Direct'}`,
          time: p.date,
          type: 'refund',
          amount: p.amount
        });
      } else {
        events.push({
          id: p.id,
          title: `Payment received (${p.method})`,
          subtitle: p.purpose || 'Stay payment',
          time: p.date,
          type: 'payment',
          amount: p.amount
        });
      }
    });

    bookings.slice(0, 3).forEach((b) => {
      events.push({
        id: b.id,
        title: `Booking ${b.booking_no} confirmed`,
        subtitle: `${b.customer?.name || 'Guest'} • ${b.property?.name}`,
        time: b.created_at?.split('T')[0] || b.check_in,
        type: 'booking',
        amount: b.grand_total
      });
    });

    return events.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5);
  }, [bookings, payments]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-[#EAE5DC] rounded-xl" />
        <div className="h-28 bg-white border border-[#D8D2C5] rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white border border-[#D8D2C5] rounded-2xl" />
          <div className="h-64 bg-white border border-[#D8D2C5] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans text-[#1A2B28]">
      {/* Overview Header (Requirement #10 & #11) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DC] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#276749]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
              {propertyFilter ? activeProperty?.name : 'All Properties Portfolio'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A2B28] mt-1">
            Overview
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}{' '}
            • Manage today's stays, front desk operations, and collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/calendar"
            className="btn btn-outline text-xs sm:text-sm flex items-center gap-2 bg-white"
          >
            <Calendar size={16} />
            <span>Calendar</span>
          </Link>
          <button
            onClick={() => navigate('/bookings/new')}
            className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Primary "Today" Editorial Section (Requirement #11) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Editorial Today Block */}
        <div className="lg:col-span-2 card p-6 bg-white border-[#D8D2C5] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6B] flex items-center gap-1.5">
                <Clock size={14} className="text-[#0D5C56]" /> Today's Operations
              </span>
              <span className="text-xs font-medium text-[#0D5C56] bg-[#E8F3F1] px-2.5 py-0.5 rounded-full">
                Active Desk
              </span>
            </div>

            <div className="mt-4">
              <div className="text-xs text-[#8E9E9B]">Current Overview</div>
              <div className="text-xl sm:text-2xl font-bold text-[#1A2B28] tracking-tight mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>{operations.arrivalsToday.length} arrivals</span>
                <span className="text-[#D8D2C5]">·</span>
                <span>{operations.departuresToday.length} departures</span>
                <span className="text-[#D8D2C5]">·</span>
                <span>{operations.inHouse.length} in-house</span>
                <span className="text-[#D8D2C5]">·</span>
                <span className="text-[#C45532]">{fmtINR(operations.totalOutstanding)} due</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-[#EAE5DC]">
            <div
              onClick={() => navigate('/bookings')}
              className="p-3 rounded-xl bg-[#F8F7F4] hover:bg-[#F3F0EA] transition-colors cursor-pointer"
            >
              <div className="text-xs text-[#5C6E6B] flex items-center justify-between">
                <span>Arrivals</span>
                <LogIn size={14} className="text-[#0D5C56]" />
              </div>
              <div className="text-2xl font-bold text-[#1A2B28] mt-1">
                {operations.arrivalsToday.length}
              </div>
              <div className="text-[11px] text-[#8E9E9B] mt-0.5">Scheduled today</div>
            </div>

            <div
              onClick={() => navigate('/bookings')}
              className="p-3 rounded-xl bg-[#F8F7F4] hover:bg-[#F3F0EA] transition-colors cursor-pointer"
            >
              <div className="text-xs text-[#5C6E6B] flex items-center justify-between">
                <span>Departures</span>
                <LogOut size={14} className="text-[#C45532]" />
              </div>
              <div className="text-2xl font-bold text-[#1A2B28] mt-1">
                {operations.departuresToday.length}
              </div>
              <div className="text-[11px] text-[#8E9E9B] mt-0.5">Rooms clearing</div>
            </div>

            <div
              onClick={() => navigate('/bookings')}
              className="p-3 rounded-xl bg-[#F8F7F4] hover:bg-[#F3F0EA] transition-colors cursor-pointer"
            >
              <div className="text-xs text-[#5C6E6B] flex items-center justify-between">
                <span>In-House</span>
                <BedDouble size={14} className="text-[#276749]" />
              </div>
              <div className="text-2xl font-bold text-[#1A2B28] mt-1">
                {operations.inHouse.length}
              </div>
              <div className="text-[11px] text-[#8E9E9B] mt-0.5">Active staying</div>
            </div>

            <div
              onClick={() => navigate('/outstanding')}
              className="p-3 rounded-xl bg-[#FAF0EB] hover:bg-[#F5E5DC] transition-colors cursor-pointer"
            >
              <div className="text-xs text-[#C45532] font-medium flex items-center justify-between">
                <span>Outstanding</span>
                <AlertCircle size={14} />
              </div>
              <div className="text-xl font-bold text-[#C45532] mt-1 truncate">
                {fmtINR(operations.totalOutstanding)}
              </div>
              <div className="text-[11px] text-[#C45532]/80 mt-0.5">Awaiting collection</div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Needs Attention Operational Box (Requirement #14) */}
        <div className="card p-6 bg-[#FAF9F6] border-[#D8D2C5] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C45532] flex items-center gap-1.5">
                <AlertTriangle size={15} /> Needs Attention
              </span>
              <span className="text-xs text-[#5C6E6B]">
                {needsAttention.length} item{needsAttention.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {needsAttention.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#5C6E6B]">
                  <CheckCircle2 size={24} className="text-[#276749] mx-auto mb-1.5 opacity-80" />
                  All check-out balances and today's arrival deposits are cleared.
                </div>
              ) : (
                needsAttention.slice(0, 3).map((item) => (
                  <div
                    key={item.booking.id}
                    onClick={() => navigate(`/bookings/${item.booking.id}`)}
                    className="p-3 rounded-xl bg-white border border-[#EAE5DC] hover:border-[#C45532] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#1A2B28] group-hover:text-[#C45532] transition-colors">
                        {item.guestName}
                      </span>
                      <span className="font-bold text-xs text-[#C45532]">
                        {fmtINR(item.dueAmount)} due
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5C6E6B] mt-1">
                      {item.propertyName} • {item.reason}
                    </div>
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentModalData({ booking: item.booking, balanceDue: item.dueAmount });
                        }}
                        className="text-[11px] font-semibold text-[#0D5C56] hover:underline flex items-center gap-1"
                      >
                        Record payment <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#EAE5DC] text-right">
            <Link
              to="/outstanding"
              className="text-xs font-semibold text-[#0D5C56] hover:underline inline-flex items-center gap-1"
            >
              View all outstanding balances <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Lists: Today's Arrivals & Departures (Requirements #12 & #13) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <div className="card p-6 bg-white border-[#D8D2C5] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC]">
            <div>
              <h2 className="text-base font-bold text-[#1A2B28] flex items-center gap-2">
                <LogIn size={18} className="text-[#0D5C56]" /> Today's Arrivals
              </h2>
              <p className="text-xs text-[#5C6E6B] mt-0.5">
                Guests expected at the front desk today
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F3F1] text-[#0D5C56]">
              {operations.arrivalsToday.length} arrivals
            </span>
          </div>

          {operations.arrivalsToday.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5C6E6B]">
              No guest arrivals scheduled for today.
            </div>
          ) : (
            <div className="divide-y divide-[#EAE5DC] max-h-80 overflow-y-auto">
              {operations.arrivalsToday.map((b) => {
                const bPayments = paymentsByBooking.get(b.id) || [];
                const fin = calculateBookingFinancials(b, bPayments);

                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-[#F8F7F4] transition-colors rounded-lg cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors truncate">
                          {b.customer?.name || 'Guest'}
                        </span>
                        <span
                          className={`badge text-[10px] ${
                            fin.paymentStatus === 'Paid'
                              ? 'bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]'
                              : fin.paymentStatus === 'Partially Paid'
                              ? 'bg-[#FDF5E8] text-[#B7791F] border border-[#F5DCAD]'
                              : 'bg-[#FDF0F0] text-[#B84A4A] border border-[#F7C6C6]'
                          }`}
                        >
                          {fin.paymentStatus}
                        </span>
                      </div>
                      <div className="text-xs text-[#5C6E6B] mt-0.5 truncate">
                        {b.property?.name} • {b.room_type}
                      </div>
                      <div className="text-[11px] text-[#8E9E9B] mt-0.5">
                        Expected: {b.property?.check_in_time || '14:00'} • {b.nights}{' '}
                        {b.nights === 1 ? 'night' : 'nights'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {b.booking_status !== 'Checked In' ? (
                        <button
                          onClick={(e) => handleQuickCheckIn(b, e)}
                          className="btn btn-outline text-xs py-1.5 px-3 bg-white hover:bg-[#E8F3F1] hover:text-[#0D5C56] border-[#D8D2C5]"
                        >
                          <UserCheck size={14} className="mr-1 text-[#0D5C56]" />
                          Check in
                        </button>
                      ) : (
                        <span className="text-xs text-[#276749] font-medium flex items-center gap-1">
                          <CheckCircle2 size={14} /> In-house
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${b.id}`);
                        }}
                        className="p-1.5 text-[#8E9E9B] hover:text-[#1A2B28]"
                        title="Open booking"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Departures */}
        <div className="card p-6 bg-white border-[#D8D2C5] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC]">
            <div>
              <h2 className="text-base font-bold text-[#1A2B28] flex items-center gap-2">
                <LogOut size={18} className="text-[#C45532]" /> Today's Departures
              </h2>
              <p className="text-xs text-[#5C6E6B] mt-0.5">
                Stays concluding today requiring settlement & key handover
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF0EB] text-[#C45532]">
              {operations.departuresToday.length} departures
            </span>
          </div>

          {operations.departuresToday.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5C6E6B]">
              No guest departures scheduled for today.
            </div>
          ) : (
            <div className="divide-y divide-[#EAE5DC] max-h-80 overflow-y-auto">
              {operations.departuresToday.map((b) => {
                const bPayments = paymentsByBooking.get(b.id) || [];
                const fin = calculateBookingFinancials(b, bPayments);

                return (
                  <div
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-[#F8F7F4] transition-colors rounded-lg cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#C45532] transition-colors truncate">
                          {b.customer?.name || 'Guest'}
                        </span>
                        {fin.amountDue > 0 ? (
                          <span className="badge text-[10px] bg-[#FAF0EB] text-[#C45532] border border-[#F5DCAD] font-bold">
                            {fmtINR(fin.amountDue)} due
                          </span>
                        ) : (
                          <span className="badge text-[10px] bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]">
                            Paid in full
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#5C6E6B] mt-0.5 truncate">
                        {b.property?.name} • {b.room_type}
                      </div>
                      <div className="text-[11px] text-[#8E9E9B] mt-0.5">
                        Check-out time: {b.property?.check_out_time || '11:00'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {fin.amountDue > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModalData({ booking: b, balanceDue: fin.amountDue });
                          }}
                          className="btn btn-accent text-xs py-1.5 px-3"
                        >
                          Record payment
                        </button>
                      ) : b.booking_status !== 'Checked Out' ? (
                        <button
                          onClick={(e) => handleQuickCheckOut(b, e)}
                          className="btn btn-outline text-xs py-1.5 px-3 bg-white hover:bg-stone-50"
                        >
                          Check out
                        </button>
                      ) : (
                        <span className="text-xs text-[#5C6E6B] font-medium">Checked Out</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bookings/${b.id}`);
                        }}
                        className="p-1.5 text-[#8E9E9B] hover:text-[#1A2B28]"
                        title="Open booking"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Analytics & Restrained Activity Stream (Requirements #15 & #34) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue & Collection Trend Chart */}
        <div className="lg:col-span-2 card p-6 bg-white border-[#D8D2C5] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1A2B28]">
                Revenue & Collection Trend
              </h3>
              <p className="text-xs text-[#5C6E6B] mt-0.5">
                Calculated strictly from real bookings and confirmed receipts
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-[#5C6E6B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D5C56]" /> Gross Booking Value
              </span>
              <span className="flex items-center gap-1.5 text-[#5C6E6B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C45532]" /> Net Collected
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D5C56" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0D5C56" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C45532" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#C45532" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE5DC" vertical={false} />
                <XAxis dataKey="month" stroke="#8E9E9B" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#8E9E9B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [fmtINR(Number(value) || 0), '']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    borderColor: '#D8D2C5',
                    boxShadow: '0 4px 12px rgba(20, 35, 30, 0.08)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross Booking Value"
                  stroke="#0D5C56"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Net Collected"
                  stroke="#C45532"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCol)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Restrained Activity Stream (Requirement #15) */}
        <div className="card p-6 bg-white border-[#D8D2C5] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE5DC]">
            <div>
              <h3 className="text-base font-bold text-[#1A2B28]">Recent Activity</h3>
              <p className="text-xs text-[#5C6E6B] mt-0.5">Chronological operations log</p>
            </div>
            <span className="text-xs text-[#8E9E9B]">Verified events</span>
          </div>

          <div className="space-y-3">
            {activityFeed.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 text-xs pb-3 border-b border-[#EAE5DC] last:border-0 last:pb-0"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'payment'
                      ? 'bg-[#EBF6EF] text-[#276749]'
                      : item.type === 'refund'
                      ? 'bg-[#FDF0F0] text-[#B84A4A]'
                      : 'bg-[#E8F3F1] text-[#0D5C56]'
                  }`}
                >
                  {item.type === 'payment' ? (
                    <CreditCard size={14} />
                  ) : item.type === 'refund' ? (
                    <AlertCircle size={14} />
                  ) : (
                    <Calendar size={14} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1A2B28] truncate">{item.title}</div>
                  <div className="text-[#5C6E6B] truncate mt-0.5">{item.subtitle}</div>
                  <div className="text-[11px] text-[#8E9E9B] mt-0.5">{fmtDate(item.time)}</div>
                </div>
                {item.amount && (
                  <div
                    className={`font-semibold shrink-0 ${
                      item.type === 'refund' ? 'text-[#B84A4A]' : 'text-[#1A2B28]'
                    }`}
                  >
                    {item.type === 'refund' ? '-' : ''}
                    {fmtINR(item.amount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded Modal for Direct Payments Recording */}
      {paymentModalData && (
        <AddPaymentModal
          booking={paymentModalData.booking}
          balanceDue={paymentModalData.balanceDue}
          onClose={() => setPaymentModalData(null)}
          onSuccess={() => {
            setPaymentModalData(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
