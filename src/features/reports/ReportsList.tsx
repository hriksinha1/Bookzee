import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { fmtINR } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';
import { AppContextType } from '../../components/layout/AppShell';
import {
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Download,
  AlertCircle,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Booking, Payment, Property } from '../../lib/repository/types';
import { useToast } from '../../context/ToastContext';

export default function ReportsList() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'year' | 'all'>('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [bList, pList, propList] = await Promise.all([
          repository.getBookings(propertyFilter || undefined),
          repository.getAllPayments(propertyFilter || undefined),
          repository.getProperties()
        ]);
        setBookings(bList);
        setPayments(pList);
        setProperties(propList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyFilter]);

  // Aggregate high-level operational financials
  const totals = useMemo(() => {
    let grossRevenue = 0;
    let totalCollected = 0;
    let totalDue = 0;
    let totalNights = 0;

    const paymentsByBooking = new Map<string, Payment[]>();
    payments.forEach((p) => {
      const list = paymentsByBooking.get(p.booking_id) || [];
      list.push(p);
      paymentsByBooking.set(p.booking_id, list);
    });

    bookings.forEach((b) => {
      if (b.booking_status !== 'Cancelled') {
        const bPayments = paymentsByBooking.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPayments);
        grossRevenue += fin.bookingTotal;
        totalCollected += fin.netPaid;
        totalDue += fin.amountDue;
        totalNights += b.nights || 1;
      }
    });

    return {
      grossRevenue,
      totalCollected,
      totalDue,
      totalNights,
      bookingsCount: bookings.filter((b) => b.booking_status !== 'Cancelled').length
    };
  }, [bookings, payments]);

  // Monthly trend chart
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { month: string; revenue: number; collected: number; stays: number }> =
      {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-US', { month: 'short' });
      map[key] = { month: key, revenue: 0, collected: 0, stays: 0 };
    }

    bookings.forEach((b) => {
      if (b.created_at && b.booking_status !== 'Cancelled') {
        const d = new Date(b.created_at);
        const key = d.toLocaleString('en-US', { month: 'short' });
        if (map[key]) {
          map[key].revenue += b.grand_total || 0;
          map[key].stays += 1;
        }
      }
    });

    payments.forEach((p) => {
      if (p.date && (p.status === 'Recorded' || p.status === 'Completed')) {
        const d = new Date(p.date);
        const key = d.toLocaleString('en-US', { month: 'short' });
        if (map[key]) {
          map[key].collected += p.amount || 0;
        }
      }
    });

    return Object.values(map);
  }, [bookings, payments]);

  // Breakdown by property
  const propertyBreakdown = useMemo(() => {
    const map: Record<string, { name: string; revenue: number }> = {};
    const propMap = properties.reduce((acc: any, p) => ({ ...acc, [p.id]: p.name }), {});

    bookings.forEach((b) => {
      if (b.booking_status !== 'Cancelled') {
        const pName = propMap[b.property_id] || 'Other';
        if (!map[pName]) map[pName] = { name: pName, revenue: 0 };
        map[pName].revenue += b.grand_total || 0;
      }
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [bookings, properties]);

  // Breakdown by payment method
  const methodBreakdown = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};

    payments.forEach((p) => {
      if (p.status === 'Recorded' || p.status === 'Completed') {
        const m = p.method || 'Other';
        if (!map[m]) map[m] = { name: m, value: 0 };
        map[m].value += p.amount || 0;
      }
    });

    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [payments]);

  // CSV Export
  function handleExportCSV() {
    const headers = 'Booking No,Guest Name,Property,Check In,Check Out,Nights,Total Amount,Payment Status\n';
    const propMap = properties.reduce((acc: any, p) => ({ ...acc, [p.id]: p.name }), {});

    const rows = bookings
      .map((b) => {
        const pName = propMap[b.property_id] || '';
        return `"${b.booking_no}","${b.customer?.name || ''}","${pName}","${b.check_in}","${
          b.check_out
        }",${b.nights},${b.grand_total},"${b.payment_status}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MyTrackYo_Hospitality_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported', 'Hospitality performance report downloaded.');
  }

  const PALETTE = ['#0F766E', '#C65D3A', '#2F7D5A', '#B7791F', '#155E75'];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white rounded-2xl border border-[#D4DED9]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
              Business Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
            Hospitality Reports
          </h1>
          <p className="text-sm text-[#5F716E] mt-0.5">
            Revenue trends, occupancy night statistics, and channel payment distribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
          >
            <Download size={15} />
            <span>Export CSV Summary</span>
          </button>
        </div>
      </div>

      {/* Top 4 Performance Cards (Requirement #27) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-white border-[#D4DED9]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
            Gross Revenue
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#18312F] mt-1 tracking-tight">
            {fmtINR(totals.grossRevenue)}
          </div>
          <div className="text-xs text-[#5F716E] mt-1">Confirmed guest tariffs</div>
        </div>

        <div className="card p-5 bg-white border-[#D4DED9]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
            Collected Revenue
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#2F7D5A] mt-1 tracking-tight">
            {fmtINR(totals.totalCollected)}
          </div>
          <div className="text-xs text-[#5F716E] mt-1">
            {totals.grossRevenue > 0
              ? `${Math.round((totals.totalCollected / totals.grossRevenue) * 100)}% collected`
              : '100%'}
          </div>
        </div>

        <div className="card p-5 bg-white border-[#D4DED9]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
            Outstanding Balance
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#B7791F] mt-1 tracking-tight">
            {fmtINR(totals.totalDue)}
          </div>
          <div className="text-xs text-[#5F716E] mt-1">Awaiting guest settlement</div>
        </div>

        <div className="card p-5 bg-white border-[#D4DED9]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5F716E]">
            Total Room Nights
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#18312F] mt-1 tracking-tight">
            {totals.totalNights}
          </div>
          <div className="text-xs text-[#5F716E] mt-1">Across {totals.bookingsCount} stays</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue & Collection Trend */}
        <div className="lg:col-span-2 card p-6 bg-white border-[#D4DED9] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#18312F]">
                Monthly Financial Progression
              </h3>
              <p className="text-xs text-[#5F716E] mt-0.5">
                Gross revenue against actual bank collections
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#5F716E]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" /> Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C65D3A]" /> Collected
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevRep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorColRep" x1="0" y1="0" x2="0" y2="1">
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
                    borderColor: '#D4DED9'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross Revenue"
                  stroke="#0F766E"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevRep)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#C65D3A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorColRep)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Payment Methods Breakdown */}
        <div className="card p-6 bg-white border-[#D4DED9] space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#18312F]">Payment Channels</h3>
            <p className="text-xs text-[#5F716E] mt-0.5">Distribution of collected funds</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {methodBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [fmtINR(Number(value) || 0), 'Amount']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    borderColor: '#D4DED9'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#E8ECE9] text-xs">
            {methodBreakdown.map((m, idx) => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#5F716E]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  {m.name}
                </span>
                <span className="font-semibold text-[#18312F]">{fmtINR(m.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property Revenue Bar Chart */}
      <div className="card p-6 bg-white border-[#D4DED9] space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[#18312F]">Revenue by Property</h3>
          <p className="text-xs text-[#5F716E] mt-0.5">
            Contribution of each homestay / boutique hotel across the portfolio
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propertyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8ECE9" vertical={false} />
              <XAxis dataKey="name" stroke="#8B9B97" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#8B9B97"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: any) => [fmtINR(Number(value) || 0), 'Revenue']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  borderColor: '#D4DED9'
                }}
              />
              <Bar dataKey="revenue" fill="#0F766E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
