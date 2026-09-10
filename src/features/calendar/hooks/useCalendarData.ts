import { useState, useEffect, useMemo, useCallback } from 'react';
import { repository } from '../../../lib/repository';
import { Booking, Payment, Property } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { CalendarStayFilter } from '../types';

export function useCalendarData(propertyFilter?: string, stayFilter: CalendarStayFilter = 'all') {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bList, pList, propList] = await Promise.all([
        repository.getBookings(propertyFilter || undefined),
        repository.getAllPayments(propertyFilter || undefined),
        repository.getProperties()
      ]);
      setBookings(bList);
      setPayments(pList);
      setProperties(propList);
    } catch (err: any) {
      console.error('Failed to load calendar data', err);
      setError("Couldn't load calendar stays.");
    } finally {
      setLoading(false);
    }
  }, [propertyFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Index payments by booking id
  const paymentsByBookingId = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const list = map.get(p.booking_id) || [];
      list.push(p);
      map.set(p.booking_id, list);
    }
    return map;
  }, [payments]);

  // Filter bookings based on stayFilter
  const filteredBookings = useMemo(() => {
    if (stayFilter === 'all') {
      return bookings.filter((b) => b.booking_status !== 'Cancelled');
    }

    return bookings.filter((b) => {
      if (b.booking_status === 'Cancelled') return false;

      if (stayFilter === 'arrivals') {
        // Will be matched dynamically on check_in
        return true;
      }
      if (stayFilter === 'departures') {
        // Will be matched dynamically on check_out
        return true;
      }
      if (stayFilter === 'in_house') {
        return b.booking_status === 'Checked In';
      }
      if (stayFilter === 'payment_due') {
        const bPayments = paymentsByBookingId.get(b.id) || [];
        const fin = calculateBookingFinancials(b, bPayments);
        return fin.amountDue > 0;
      }
      return true;
    });
  }, [bookings, stayFilter, paymentsByBookingId]);

  // Pre-indexed map of dateStr -> bookings active on that day
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();

    for (const b of filteredBookings) {
      if (!b.check_in || !b.check_out) continue;

      // Iterate through dates from check_in to check_out
      const start = new Date(b.check_in + 'T00:00:00');
      const end = new Date(b.check_out + 'T00:00:00');

      // Safeguard against bad date ranges
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) continue;

      const cur = new Date(start);
      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];

        // If filter is arrivals, only include on check_in
        if (stayFilter === 'arrivals' && dateStr !== b.check_in) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }

        // If filter is departures, only include on check_out
        if (stayFilter === 'departures' && dateStr !== b.check_out) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }

        const list = map.get(dateStr) || [];
        list.push(b);
        map.set(dateStr, list);

        cur.setDate(cur.getDate() + 1);
      }
    }

    return map;
  }, [filteredBookings, stayFilter]);

  const getBookingsForDate = useCallback(
    (dateStr: string): Booking[] => {
      return bookingsByDate.get(dateStr) || [];
    },
    [bookingsByDate]
  );

  return {
    loading,
    error,
    refresh: loadData,
    bookings,
    filteredBookings,
    payments,
    properties,
    paymentsByBookingId,
    getBookingsForDate
  };
}
