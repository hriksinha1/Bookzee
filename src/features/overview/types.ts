import { Booking } from '../../lib/repository/types';

export interface TodayMetrics {
  arrivalsCount: number;
  departuresCount: number;
  inHouseCount: number;
  arrivals: Booking[];
  departures: Booking[];
  inHouse: Booking[];
}
