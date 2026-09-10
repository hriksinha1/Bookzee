import React from 'react';
import { TodayMetrics } from '../types';

interface TodaySummaryProps {
  metrics: TodayMetrics;
}

export default function TodaySummary({ metrics }: TodaySummaryProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-3 border-b border-[#EAE5DC]">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-[#1A2B28] tracking-tight">Today</h2>
        <span className="text-sm font-medium text-[#5C6E6B]">
          {metrics.arrivalsCount} {metrics.arrivalsCount === 1 ? 'arrival' : 'arrivals'} ·{' '}
          {metrics.departuresCount} {metrics.departuresCount === 1 ? 'departure' : 'departures'} ·{' '}
          {metrics.inHouseCount} in-house
        </span>
      </div>
      <span className="text-xs text-[#5C6E6B]">Active front-desk operations</span>
    </div>
  );
}
