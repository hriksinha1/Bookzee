import { useState, useEffect, useMemo, useCallback } from 'react';
import { repository } from '../../../lib/repository';
import { Booking, Payment, Property, Customer } from '../../../lib/repository/types';
import {
  selectAttentionItems,
  selectTodayMetrics,
  selectFinancialSnapshot,
  selectRecentActivity
} from '../selectors/overviewSelectors';
import { OverviewAnalyticsService } from '../services/overviewAnalyticsService';
import {
  AttentionItem,
  TodayMetrics,
  FinancialSnapshotData,
  ActivityEvent,
  OverviewAnalytics
} from '../types';

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

  // Derived state via pure selectors
  const attentionItems = useMemo<AttentionItem[]>(
    () => selectAttentionItems(bookings, paymentsByBookingId, todayStr),
    [bookings, paymentsByBookingId, todayStr]
  );

  const todayMetrics = useMemo<TodayMetrics>(
    () => selectTodayMetrics(bookings, todayStr),
    [bookings, todayStr]
  );

  const financialSnapshot = useMemo<FinancialSnapshotData>(
    () => selectFinancialSnapshot(bookings, paymentsByBookingId),
    [bookings, paymentsByBookingId]
  );

  const activityFeed = useMemo<ActivityEvent[]>(
    () => selectRecentActivity(payments, bookings),
    [payments, bookings]
  );

  const analytics = useMemo<OverviewAnalytics>(
    () => OverviewAnalyticsService.getAnalytics(bookings, payments, propertyFilter, 14, true),
    [bookings, payments, propertyFilter]
  );

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
    analytics
  };
}
