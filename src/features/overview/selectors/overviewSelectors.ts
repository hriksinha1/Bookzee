import { Booking } from '../../../lib/repository/types';
import { TodayMetrics } from '../types';

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
