import { useState, useEffect, useMemo, useCallback } from 'react';
import { repository } from '../../../lib/repository';
import { Booking, Payment } from '../../../lib/repository/types';
import { selectTodayMetrics } from '../selectors/overviewSelectors';
import { TodayMetrics } from '../types';

export function useOverviewData(propertyFilter?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bList, pList] = await Promise.all([
        repository.getBookings(propertyFilter || undefined),
        repository.getAllPayments(propertyFilter || undefined)
      ]);
      setBookings(bList);
      setPayments(pList);
    } catch (err: any) {
      console.error('Failed to load overview data', err);
      setError("Couldn't load today's operations.");
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

  // Derived today's operations
  const todayMetrics = useMemo<TodayMetrics>(
    () => selectTodayMetrics(bookings, todayStr),
    [bookings, todayStr]
  );

  return {
    loading,
    error,
    refresh: loadData,
    paymentsByBookingId,
    todayMetrics
  };
}
