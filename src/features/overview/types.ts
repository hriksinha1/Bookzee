import { Booking, Payment, Property, Customer } from '../../lib/repository/types';

export interface AttentionItem {
  id: string;
  booking: Booking;
  guestName: string;
  propertyName: string;
  roomName: string;
  dueAmount: number;
  reason: string;
  type: 'checkout_due' | 'arrival_unpaid' | 'overdue_settlement' | 'late_checkout';
  isTodayCheckout: boolean;
}

export interface TodayMetrics {
  arrivalsCount: number;
  departuresCount: number;
  inHouseCount: number;
  arrivals: Booking[];
  departures: Booking[];
  inHouse: Booking[];
}

export interface FinancialSnapshotData {
  bookingValue: number;
  collected: number;
  outstanding: number;
}

export interface ActivityEvent {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: 'payment' | 'booking' | 'refund';
  amount?: number;
}
