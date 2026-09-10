import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  BedDouble,
  AlertCircle,
  TrendingUp,
  Calendar,
  CreditCard,
  Building2,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldAlert
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

export default function Dashboard() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [propertyFilter]);

  const activeProperty = properties.find((p) => p.id === propertyFilter);
  const todayStr = new Date().toISOString().split('T')[0];

  // Derive operational metrics
  const operations = useMemo(() => {
    // Map payments by booking ID
    const paymentsByBooking = new Map<string, Payment[]>();
    payments.forEach((p) => {
      const list = paymentsByBooking.get(p.booking_id) || [];
      list.push(p);
      paymentsByBooking.set(p.booking_id, list);
    });

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
  }, [bookings, payments, todayStr]);

  // Real chart data aggregated from bookings across recent months/weeks
  const chartData = useMemo(() => {
    const monthsMap: Record<string, { month: string; revenue: number; collected: number }> = {};

    // Seed last 4 calendar months
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

  // Dynamic real activity feed derived from bookings and payments
  const activityFeed = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      subtitle: string;
      time: string;
      type: 'payment' | 'booking' | 'refund';
      amount?: number;
    }> = [];

    payments.slice(0, 5).forEach((p) => {
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

    bookings.slice(0, 4).forEach((b) => {
      events.push({
        id: b.id,
        title: `Booking ${b.booking_no} created`,
        subtitle: `${b.customer?.name || 'Guest'} • ${b.property?.name}`,
        time: b.created_at?.split('T')[0] || b.check_in,
        type: 'booking',
        amount: b.grand_total
      });
    });

    return events.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);
  }, [bookings, payments]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white border border-[#D4DED9] rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-white border border-[#D4DED9] rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Workspace Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2F7D5A]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
              Operational Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
            Today at {propertyFilter ? activeProperty?.name : 'Portfolio Overview'}
          </h1>
          <p className="text-sm text-[#5F716E] mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}{' '}
            • Real-time room operations & collection status
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/calendar"
            className="btn btn-outline text-xs sm:text-sm flex items-center gap-2 bg-white"
          >
            <Calendar size={16} />
            <span>Open Calendar</span>
          </Link>
          <Link
            to="/bookings/new"
            className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* 1. TOP OPERATIONAL METRICS (Requirement #13) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Arrivals Card */}
        <div
          onClick={() => navigate('/bookings')}
          className="card p-5 cursor-pointer hover:border-[#0F766E] transition-all group bg-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
              Arrivals Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E6F3F1] text-[#0F766E] flex items-center justify-center">
              <LogIn size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#18312F] tracking-tight">
              {operations.arrivalsToday.length}
            </span>
            <span className="text-xs font-medium text-[#0F766E] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Check in <ArrowRight size={13} />
            </span>
          </div>
          <div className="text-xs text-[#5F716E] mt-1">
            {operations.arrivalsToday.length > 0 ? 'Guests arriving today' : 'No arrivals scheduled'}
          </div>
        </div>

        {/* Departures Card */}
        <div
          onClick={() => navigate('/bookings')}
          className="card p-5 cursor-pointer hover:border-[#0F766E] transition-all group bg-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
              Departures Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FBEFEA] text-[#C65D3A] flex items-center justify-center">
              <LogOut size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#18312F] tracking-tight">
              {operations.departuresToday.length}
            </span>
            <span className="text-xs font-medium text-[#C65D3A] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Check out <ArrowRight size={13} />
            </span>
          </div>
          <div className="text-xs text-[#5F716E] mt-1">
            {operations.departuresToday.length > 0 ? 'Rooms clearing today' : 'No check-outs scheduled'}
          </div>
        </div>

        {/* In-House Card */}
        <div
          onClick={() => navigate('/bookings')}
          className="card p-5 cursor-pointer hover:border-[#0F766E] transition-all group bg-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
              In-House Stays
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF5EE] text-[#2F7D5A] flex items-center justify-center">
              <BedDouble size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-[#18312F] tracking-tight">
              {operations.inHouse.length}
            </span>
            <span className="text-xs font-medium text-[#2F7D5A] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              View all <ArrowRight size={13} />
            </span>
          </div>
          <div className="text-xs text-[#5F716E] mt-1">Active occupied rooms</div>
        </div>

        {/* Outstanding Balance Card */}
        <div
          onClick={() => navigate('/outstanding')}
          className="card p-5 cursor-pointer hover:border-[#B7791F] transition-all group bg-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
              Outstanding Due
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FDF5E8] text-[#B7791F] flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#18312F] tracking-tight">
              {fmtINR(operations.totalOutstanding)}
            </span>
            <span className="text-xs font-medium text-[#B7791F] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Collect <ArrowRight size={13} />
            </span>
          </div>
          <div className="text-xs text-[#5F716E] mt-1">Awaiting guest settlement</div>
        </div>
      </div>

      {/* 2. TODAY'S OPERATIONS QUICK CTA BAR (Requirement #15) */}
      <div className="card p-5 sm:p-6 bg-gradient-to-br from-white to-[#FAF8F5] border-[#D4DED9]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8ECE9] pb-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#18312F] flex items-center gap-2">
              <Clock size={18} className="text-[#0F766E]" />
              Today's Key Actions
            </h2>
            <p className="text-xs text-[#5F716E] mt-0.5">
              Immediate front-desk responsibilities requiring staff action today
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Action 1: Arrivals */}
          <div className="p-4 rounded-xl bg-white border border-[#E8ECE9] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#5F716E]">Front Desk Check-in</span>
                <span className="px-2 py-0.5 rounded-full bg-[#E6F3F1] text-[#0F766E] text-xs font-semibold">
                  {operations.arrivalsToday.length} Pending
                </span>
              </div>
              <p className="text-sm font-semibold text-[#18312F] mt-2">
                {operations.arrivalsToday.length > 0
                  ? `${operations.arrivalsToday[0].customer?.name} & ${operations.arrivalsToday.length - 1} other guests`
                  : 'All expected arrivals are up to date'}
              </p>
            </div>
            <button
              onClick={() => navigate('/bookings')}
              className="btn btn-outline text-xs w-full justify-between"
            >
              <span>View Arrivals</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Action 2: Departures */}
          <div className="p-4 rounded-xl bg-white border border-[#E8ECE9] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#5F716E]">Settlement & Check-out</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FBEFEA] text-[#C65D3A] text-xs font-semibold">
                  {operations.departuresToday.length} Pending
                </span>
              </div>
              <p className="text-sm font-semibold text-[#18312F] mt-2">
                {operations.departuresToday.length > 0
                  ? `${operations.departuresToday[0].customer?.name} & ${operations.departuresToday.length - 1} other rooms`
                  : 'No scheduled departures remaining'}
              </p>
            </div>
            <button
              onClick={() => navigate('/bookings')}
              className="btn btn-outline text-xs w-full justify-between"
            >
              <span>View Departures</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Action 3: Review Payments */}
          <div className="p-4 rounded-xl bg-white border border-[#E8ECE9] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#5F716E]">Balance Clearance</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FDF5E8] text-[#B7791F] text-xs font-semibold">
                  {fmtINR(operations.totalOutstanding)} Due
                </span>
              </div>
              <p className="text-sm font-semibold text-[#18312F] mt-2">
                Collect deposits & final payments before key return
              </p>
            </div>
            <button
              onClick={() => navigate('/outstanding')}
              className="btn btn-primary text-xs w-full justify-between"
            >
              <span>Review Payments</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. SECONDARY BUSINESS PERFORMANCE STRIP (Requirement #14) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#D4DED9]">
        <div className="p-2">
          <div className="text-xs text-[#5F716E]">Total Portfolio Stays</div>
          <div className="text-xl font-bold text-[#18312F] mt-1">
            {operations.totalBookings}
          </div>
        </div>
        <div className="p-2 border-l border-[#E8ECE9]">
          <div className="text-xs text-[#5F716E]">Gross Revenue</div>
          <div className="text-xl font-bold text-[#18312F] mt-1">
            {fmtINR(operations.totalRevenue)}
          </div>
        </div>
        <div className="p-2 border-l border-[#E8ECE9]">
          <div className="text-xs text-[#5F716E]">Collected Revenue</div>
          <div className="text-xl font-bold text-[#2F7D5A] mt-1">
            {fmtINR(operations.totalCollected)}
          </div>
        </div>
        <div className="p-2 border-l border-[#E8ECE9]">
          <div className="text-xs text-[#5F716E]">Collection Rate</div>
          <div className="text-xl font-bold text-[#0F766E] mt-1">
            {operations.totalRevenue > 0
              ? `${Math.round((operations.totalCollected / operations.totalRevenue) * 100)}%`
              : '100%'}
          </div>
        </div>
      </div>

      {/* 4. REVENUE TREND CHART & ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue Trend Chart */}
        <div className="lg:col-span-2 card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#18312F]">
                Revenue & Collection Trend
              </h3>
              <p className="text-xs text-[#5F716E] mt-0.5">
                Aggregated from actual bookings and confirmed payment transactions
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#5F716E]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></span> Gross Revenue
              </span>
              <span className="flex items-center gap-1.5 text-[#5F716E]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C65D3A]"></span> Collected
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C65D3A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C65D3A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE9" vertical={false} />
                <XAxis dataKey="month" stroke="#8B9B97" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#8B9B97"
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
                    borderColor: '#D4DED9',
                    boxShadow: '0 4px 12px rgba(15, 35, 30, 0.08)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross Revenue"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#C65D3A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCol)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Live Activity Feed (Requirement #17) */}
        <div className="card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#18312F]">Recent Activity</h3>
            <span className="text-xs text-[#5F716E]">Live events</span>
          </div>

          <div className="space-y-3.5">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-xs pb-3 border-b border-[#E8ECE9] last:border-0 last:pb-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'payment'
                      ? 'bg-[#EAF5EE] text-[#2F7D5A]'
                      : item.type === 'refund'
                      ? 'bg-[#FDF0F0] text-[#B84A4A]'
                      : 'bg-[#E6F3F1] text-[#0F766E]'
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
                  <div className="font-semibold text-[#18312F] truncate">{item.title}</div>
                  <div className="text-[#5F716E] truncate mt-0.5">{item.subtitle}</div>
                  <div className="text-[11px] text-[#8B9B97] mt-0.5">{fmtDate(item.time)}</div>
                </div>
                {item.amount && (
                  <div
                    className={`font-semibold shrink-0 ${
                      item.type === 'refund' ? 'text-[#B84A4A]' : 'text-[#18312F]'
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

      {/* 5. RECENT BOOKINGS LIST (Requirement #16) */}
      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#18312F]">Recent Stays</h3>
            <p className="text-xs text-[#5F716E] mt-0.5">
              Latest bookings across properties. Click any row to view full details.
            </p>
          </div>
          <Link
            to="/bookings"
            className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center gap-1"
          >
            View all bookings <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8ECE9] text-xs font-semibold text-[#5F716E] uppercase tracking-wider">
                <th className="py-3 px-3">Guest & Code</th>
                <th className="py-3 px-3">Property</th>
                <th className="py-3 px-3">Dates</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Stay Status</th>
                <th className="py-3 px-3 text-center">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECE9]">
              {bookings.slice(0, 6).map((b) => {
                const bPayments = payments.filter((p) => p.booking_id === b.id);
                const fin = calculateBookingFinancials(b, bPayments);

                return (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className="hover:bg-[#FAF8F5] cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#18312F] group-hover:text-[#0F766E] transition-colors">
                        {b.customer?.name || 'Guest'}
                      </div>
                      <div className="text-xs text-[#8B9B97] font-mono">{b.booking_no}</div>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#5F716E]">
                      {b.property?.name || 'Property'}
                    </td>
                    <td className="py-3 px-3 text-xs text-[#18312F]">
                      {fmtDate(b.check_in)} – {fmtDate(b.check_out)}
                      <div className="text-[11px] text-[#8B9B97]">
                        {b.nights} {b.nights === 1 ? 'night' : 'nights'} • {b.room_type}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#18312F]">
                      {fmtINR(fin.bookingTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`badge ${
                          b.booking_status === 'Checked In'
                            ? 'bg-[#EAF5EE] text-[#2F7D5A] border border-[#BDE4CD]'
                            : b.booking_status === 'Checked Out'
                            ? 'bg-stone-100 text-stone-600 border border-stone-200'
                            : 'bg-[#E6F3F1] text-[#0F766E] border border-[#BDE4CD]'
                        }`}
                      >
                        {b.booking_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`badge ${
                          fin.paymentStatus === 'Paid'
                            ? 'bg-[#EAF5EE] text-[#2F7D5A] border border-[#BDE4CD]'
                            : fin.paymentStatus === 'Partially Paid'
                            ? 'bg-[#FDF5E8] text-[#B7791F] border border-[#F6DBA9]'
                            : 'bg-[#FDF0F0] text-[#B84A4A] border border-[#F7C5C5]'
                        }`}
                      >
                        {fin.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
