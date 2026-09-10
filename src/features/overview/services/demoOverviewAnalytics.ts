import { OverviewAnalytics } from '../types';

/**
 * Deterministic fallback fixture for demo / development mode
 * when the repository has no payment or booking activity recorded in the date window.
 */
export const demoOverviewAnalytics: OverviewAnalytics = {
  range: {
    start: 'Aug 28',
    end: 'Sep 10'
  },
  totals: {
    bookingValue: 336980,
    collected: 258760,
    outstanding: 78220
  },
  points: [
    { date: 'Aug 28', bookingValue: 18000, collected: 12000 },
    { date: 'Aug 30', bookingValue: 24000, collected: 20000 },
    { date: 'Sep 01', bookingValue: 32000, collected: 26000 },
    { date: 'Sep 03', bookingValue: 15000, collected: 15000 },
    { date: 'Sep 05', bookingValue: 42000, collected: 34000 },
    { date: 'Sep 07', bookingValue: 28000, collected: 22000 },
    { date: 'Sep 09', bookingValue: 38000, collected: 31000 },
    { date: 'Sep 10', bookingValue: 22000, collected: 18000 }
  ]
};
