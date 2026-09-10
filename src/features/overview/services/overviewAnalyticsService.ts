import { Booking, Payment } from '../../../lib/repository/types';
import { OverviewAnalytics, AnalyticsPoint } from '../types';
import { demoOverviewAnalytics } from './demoOverviewAnalytics';

/**
 * Service to calculate real overview analytics from repository data.
 * Pure logic decoupled from React rendering or visual chart elements.
 */
export class OverviewAnalyticsService {
  /**
   * Derive analytics for a given time window (default 14 days).
   * Respects property filtering automatically.
   */
  static getAnalytics(
    bookings: Booking[],
    payments: Payment[],
    propertyFilter?: string,
    days: number = 14,
    useDemoFallbackIfEmpty: boolean = false
  ): OverviewAnalytics {
    // 1. Filter bookings & payments by property if scoped
    const filteredBookings = propertyFilter
      ? bookings.filter((b) => b.property_id === propertyFilter && b.booking_status !== 'Cancelled')
      : bookings.filter((b) => b.booking_status !== 'Cancelled');

    const filteredPayments = propertyFilter
      ? payments.filter((p) => {
          const propId = p.booking?.property_id;
          return (
            (propId === propertyFilter || !propId) &&
            (p.status === 'Recorded' || p.status === 'Completed')
          );
        })
      : payments.filter((p) => p.status === 'Recorded' || p.status === 'Completed');

    // 2. Generate date buckets for the last `days` days
    const now = new Date();
    const pointsMap = new Map<string, { label: string; bookingValue: number; collected: number }>();
    const dateKeys: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      pointsMap.set(iso, { label, bookingValue: 0, collected: 0 });
      dateKeys.push(iso);
    }

    let totalBookingVal = 0;
    let totalCollected = 0;

    // 3. Aggregate bookings
    for (const b of filteredBookings) {
      totalBookingVal += b.grand_total || 0;
      const bDate = b.created_at ? b.created_at.split('T')[0] : b.check_in;
      if (bDate && pointsMap.has(bDate)) {
        const item = pointsMap.get(bDate)!;
        item.bookingValue += b.grand_total || 0;
      }
    }

    // 4. Aggregate payments
    for (const p of filteredPayments) {
      totalCollected += p.amount || 0;
      const pDate = p.date ? p.date.split('T')[0] : p.created_at ? p.created_at.split('T')[0] : '';
      if (pDate && pointsMap.has(pDate)) {
        const item = pointsMap.get(pDate)!;
        item.collected += p.amount || 0;
      }
    }

    const points: AnalyticsPoint[] = dateKeys.map((k) => {
      const p = pointsMap.get(k)!;
      return {
        date: p.label,
        bookingValue: p.bookingValue,
        collected: p.collected
      };
    });

    // Check if there is any non-zero activity in the window
    const hasActivity = points.some((pt) => pt.collected > 0 || pt.bookingValue > 0);

    if (!hasActivity && useDemoFallbackIfEmpty) {
      return demoOverviewAnalytics;
    }

    const startLabel = points[0]?.date || '';
    const endLabel = points[points.length - 1]?.date || '';

    return {
      range: {
        start: startLabel,
        end: endLabel
      },
      points,
      totals: {
        bookingValue: totalBookingVal,
        collected: totalCollected,
        outstanding: Math.max(0, totalBookingVal - totalCollected)
      }
    };
  }
}
