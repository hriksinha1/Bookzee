import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { OverviewAnalytics } from '../types';
import { fmtINR } from '../../../lib/utils/formatters';

interface CollectionsChartProps {
  analytics: OverviewAnalytics;
}

// Custom restrained tooltip matching Bookzee design tokens
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const collected = payload.find((p: any) => p.dataKey === 'collected')?.value || 0;
    const bookingVal = payload.find((p: any) => p.dataKey === 'bookingValue')?.value || 0;

    return (
      <div className="p-2.5 rounded-lg border border-[#D8D2C5] bg-white shadow-md text-xs space-y-1 z-50">
        <div className="font-semibold text-[#1A2B28]">{label}</div>
        <div className="flex items-center justify-between gap-4 text-[#0D5C56]">
          <span>Collected</span>
          <span className="font-medium">{fmtINR(collected)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#5C6E6B]">
          <span>Booking value</span>
          <span className="font-medium">{fmtINR(bookingVal)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function CollectionsChart({ analytics }: CollectionsChartProps) {
  const points = analytics.points || [];
  const hasData = points.some((p) => p.collected > 0 || p.bookingValue > 0);

  if (!hasData) {
    return (
      <div className="p-6 rounded-xl border border-[#D8D2C5] bg-white text-center text-xs text-[#5C6E6B]">
        Not enough activity to show a trend yet.
      </div>
    );
  }

  // Format tick numbers (e.g. 20000 -> ₹20k)
  const formatYAxis = (val: number) => {
    if (val === 0) return '₹0';
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
    return `₹${val}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0D5C56]" />
            <span className="font-medium text-[#1A2B28]">Collected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#8FA7A3]" />
            <span className="text-[#5C6E6B]">Booking value</span>
          </div>
        </div>
        <span className="text-[11px] text-[#5C6E6B]">
          {analytics.range.start} – {analytics.range.end}
        </span>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="collectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D5C56" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0D5C56" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#EAE5DC" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#5C6E6B"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#EAE5DC' }}
            />
            <YAxis
              stroke="#5C6E6B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomChartTooltip />} />
            <Area
              type="monotone"
              dataKey="bookingValue"
              stroke="#8FA7A3"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke="#0D5C56"
              strokeWidth={2}
              fill="url(#collectedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
