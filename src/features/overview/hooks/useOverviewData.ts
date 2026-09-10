import { useState, useEffect, useMemo, useCallback } from 'react';
import { repository } from '../../../lib/repository';
import { Booking, Payment, Property, Customer } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { AttentionItem, TodayMetrics, FinancialSnapshotData, ActivityEvent } from '../types';

export function useOverviewData(propertyFilter?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bList, pList, propList, custList] = await Promise.all([
        repository.getBookings(propertyFilter || undefined),
        repository.getAllPayments(propertyFilter || undefined),
        repository.getProperties(),
        repository.getCustomers()
      ]);
      setBookings(bList);
      setPayments(pList);
      setProperties(propList);
      setCustomers(custList);
    } catch (err: any) {
      console.error('Failed to load overview data', err);
      setError("Couldn't load today's stays.");
    } finally {
      setLoading(false);
    }
  }, [propertyFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Pre-indexed map of payments by booking ID: O(1) lookups
  const paymentsByBookingId = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const existing = map.get(p.booking_id);
      if (existing) {
        existing.push(p);
      } else {
        map.set(p.booking_id, [p]);
      }
    }
    return map;
  }, [payments]);

  // Section A: Needs Attention Queue
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    for (const b of bookings) {
      if (b.booking_status === 'Cancelled') continue;
      const bPayments = paymentsByBookingId.get(b.id) || [];
      const fin = calculateBookingFinancials(b, bPayments);

      if (fin.amountDue > 0) {
        if (b.check_out === todayStr) {
          items.push({
            id: `attention-checkout-${b.id}`,
            booking: b,
            guestName: b.customer?.name || 'Guest',
            propertyName: b.property?.name || 'Property',
            roomName: b.room_type || 'Room',
            dueAmount: fin.amountDue,
            reason: 'Checkout today with unpaid balance',
            type: 'checkout_due',
            isTodayCheckout: true
          });
        } else if (b.check_in === todayStr && fin.paid === 0) {
          items.push({
            id: `attention-arrival-${b.id}`,
            booking: b,
            guestName: b.customer?.name || 'Guest',
            propertyName: b.property?.name || 'Property',
            roomName: b.room_type || 'Room',
            dueAmount: fin.amountDue,
            reason: 'Arrival today without advance deposit',
            type: 'arrival_unpaid',
            isTodayCheckout: false
          });
        }
      }
    }

    return items;
  }, [bookings, paymentsByBookingId, todayStr]);

  // Section B: Today Operations & Section C: In-House
  const todayMetrics = useMemo<TodayMetrics>(() => {
    const arrivals = bookings.filter(
      (b) => b.check_in === todayStr && b.booking_status !== 'Cancelled'
    );
    const departures = bookings.filter(
      (b) => b.check_out === todayStr && b.booking_status !== 'Cancelled'
    );
    const inHouse = bookings.filter(
      (b) =>
        b.booking_status === 'Checked In' ||
        (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled')
    );

    return {
      arrivalsCount: arrivals.length,
      departuresCount: departures.length,
      inHouseCount: inHouse.length,
      arrivals,
      departures,
      inHouse
    };
  }, [bookings, todayStr]);

  // Section D: Financial Snapshot
  const financialSnapshot = useMemo<FinancialSnapshotData>(() => {
    let bookingValue = 0;
    let collected = 0;
    let outstanding = 0;

    for (const b of bookings) {
      if (b.booking_status === 'Cancelled') continue;
      const bPayments = paymentsByBookingId.get(b.id) || [];
      const fin = calculateBookingFinancials(b, bPayments);
      bookingValue += fin.bookingTotal;
      collected += fin.netPaid;
      outstanding += fin.amountDue;
    }

    return {
      bookingValue,
      collected,
      outstanding
    };
  }, [bookings, paymentsByBookingId]);

  // Section E: Activity Feed
  const activityFeed = useMemo<ActivityEvent[]>(() => {
    const events: ActivityEvent[] = [];

    // Most recent payments
    const sortedPayments = [...payments]
      .filter((p) => p.status === 'Recorded' || p.status === 'Completed' || p.status === 'Refunded')
      .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
      .slice(0, 5);

    for (const p of sortedPayments) {
      const isRefund = p.status === 'Refunded';
      const timeStr = p.created_at
        ? new Date(p.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : 'Recent';
      events.push({
        id: `act-pay-${p.id}`,
        title: isRefund ? `Refund issued · ₹${(p.amount || 0).toLocaleString('en-IN')}` : `Payment recorded · ₹${(p.amount || 0).toLocaleString('en-IN')}`,
        subtitle: `${p.booking?.customer?.name || 'Guest'} · ${p.booking?.property?.name || 'Stay'} (${p.method || 'UPI'})`,
        time: timeStr,
        type: isRefund ? 'refund' : 'payment',
        amount: p.amount
      });
    }

    // Most recent bookings
    const sortedBookings = [...bookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    for (const b of sortedBookings) {
      const timeStr = b.created_at
        ? new Date(b.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : 'Earlier';
      events.push({
        id: `act-book-${b.id}`,
        title: `Booking created · ${b.booking_no}`,
        subtitle: `${b.customer?.name || 'Guest'} · ${b.property?.name || 'Stay'} (${b.nights} nights)`,
        time: timeStr,
        type: 'booking'
      });
    }

    return events.slice(0, 6);
  }, [payments, bookings]);

  // Section F: Real monthly progression chart data
  const chartData = useMemo(() => {
    const monthsMap: Record<string, { month: string; revenue: number; collected: number }> = {};

    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-US', { month: 'short' });
      monthsMap[key] = { month: key, revenue: 0, collected: 0 };
    }

    for (const b of bookings) {
      if (b.created_at && b.booking_status !== 'Cancelled') {
        const d = new Date(b.created_at);
        const mKey = d.toLocaleString('en-US', { month: 'short' });
        if (monthsMap[mKey]) {
          monthsMap[mKey].revenue += b.grand_total || 0;
        }
      }
    }

    for (const p of payments) {
      if (p.date && (p.status === 'Recorded' || p.status === 'Completed')) {
        const d = new Date(p.date);
        const mKey = d.toLocaleString('en-US', { month: 'short' });
        if (monthsMap[mKey]) {
          monthsMap[mKey].collected += p.amount || 0;
        }
      }
    }

    return Object.values(monthsMap);
  }, [bookings, payments]);

  return {
    loading,
    error,
    refresh: loadData,
    bookings,
    payments,
    properties,
    customers,
    paymentsByBookingId,
    attentionItems,
    todayMetrics,
    financialSnapshot,
    activityFeed,
    chartData
  };
}
