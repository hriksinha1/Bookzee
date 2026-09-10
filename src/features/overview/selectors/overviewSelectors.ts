import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { AttentionItem, TodayMetrics, FinancialSnapshotData, ActivityEvent } from '../types';

/**
 * Select actionable exceptions only:
 * - Checkout today with unpaid balance
 * - Arrival today without payment / advance deposit
 * - Past checkout that is still 'Checked In' (Late checkout)
 * - Confirmed stays with overdue balance
 */
export function selectAttentionItems(
  bookings: Booking[],
  paymentsByBookingId: Map<string, Payment[]>,
  todayStr: string
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const b of bookings) {
    if (b.booking_status === 'Cancelled' || b.booking_status === 'Checked Out') continue;

    const bPayments = paymentsByBookingId.get(b.id) || [];
    const fin = calculateBookingFinancials(b, bPayments);

    // 1. Checkout today with unpaid balance
    if (b.check_out === todayStr && fin.amountDue > 0) {
      items.push({
        id: `att-checkout-${b.id}`,
        booking: b,
        guestName: b.customer?.name || 'Guest',
        propertyName: b.property?.name || 'Property',
        roomName: b.room_type || 'Room',
        dueAmount: fin.amountDue,
        reason: 'Checkout today with outstanding balance',
        type: 'checkout_due',
        isTodayCheckout: true
      });
      continue;
    }

    // 2. Late checkout (checkout date was yesterday or earlier, still Checked In)
    if (b.check_out < todayStr && b.booking_status === 'Checked In') {
      items.push({
        id: `att-late-${b.id}`,
        booking: b,
        guestName: b.customer?.name || 'Guest',
        propertyName: b.property?.name || 'Property',
        roomName: b.room_type || 'Room',
        dueAmount: fin.amountDue,
        reason: 'Late checkout · Expected ' + b.check_out,
        type: 'late_checkout',
        isTodayCheckout: false
      });
      continue;
    }

    // 3. Arrival today without advance deposit
    if (b.check_in === todayStr && fin.paid === 0) {
      items.push({
        id: `att-arrival-${b.id}`,
        booking: b,
        guestName: b.customer?.name || 'Guest',
        propertyName: b.property?.name || 'Property',
        roomName: b.room_type || 'Room',
        dueAmount: fin.amountDue,
        reason: 'Arrival today · No advance payment',
        type: 'arrival_unpaid',
        isTodayCheckout: false
      });
      continue;
    }
  }

  return items;
}

/**
 * Select today's operational queue:
 * - Arrivals today
 * - Departures today
 * - Guests currently in-house
 */
export function selectTodayMetrics(bookings: Booking[], todayStr: string): TodayMetrics {
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
}

/**
 * Financial snapshot calculation
 */
export function selectFinancialSnapshot(
  bookings: Booking[],
  paymentsByBookingId: Map<string, Payment[]>
): FinancialSnapshotData {
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
}

/**
 * Select recent activity events (chronologically ordered)
 */
export function selectRecentActivity(payments: Payment[], bookings: Booking[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

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
      title: isRefund
        ? `Refund issued · ₹${(p.amount || 0).toLocaleString('en-IN')}`
        : `Payment recorded · ₹${(p.amount || 0).toLocaleString('en-IN')}`,
      subtitle: `${p.booking?.customer?.name || 'Guest'} · ${p.booking?.property?.name || 'Stay'}`,
      time: timeStr,
      type: isRefund ? 'refund' : 'payment',
      amount: p.amount
    });
  }

  const sortedBookings = [...bookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  for (const b of sortedBookings) {
    const timeStr = b.created_at
      ? new Date(b.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : 'Earlier';
    events.push({
      id: `act-book-${b.id}`,
      title: `Booking created`,
      subtitle: `${b.customer?.name || 'Guest'} · ${b.property?.name || 'Stay'}`,
      time: timeStr,
      type: 'booking'
    });
  }

  return events.slice(0, 5);
}
