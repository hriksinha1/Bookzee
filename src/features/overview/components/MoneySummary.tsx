import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FinancialSnapshotData, OverviewAnalytics } from '../types';
import { fmtINR } from '../../../lib/utils/formatters';
import CollectionsChart from './CollectionsChart';

interface MoneySummaryProps {
  data: FinancialSnapshotData;
  analytics?: OverviewAnalytics;
}

export default function MoneySummary({ data, analytics }: MoneySummaryProps) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28]">
          Money
        </h2>
        <span className="text-xs text-[#5C6E6B]">Financial snapshot</span>
      </div>

      <div className="p-4 sm:p-5 rounded-xl border border-[#D8D2C5] bg-white shadow-2xs space-y-4">
        {/* Clean 3-column financial values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EAE5DC]">
          <div className="pt-2 sm:pt-0 sm:px-2 first:px-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6E6B]">
              Booking value
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[#1A2B28] mt-1 tracking-tight">
              {fmtINR(data.bookingValue)}
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6E6B]">
              Collected
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[#276749] mt-1 tracking-tight">
              {fmtINR(data.collected)}
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6E6B]">
              Outstanding
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[#C45532] mt-1 tracking-tight">
              {fmtINR(data.outstanding)}
            </div>
          </div>
        </div>

        {/* Collections Over Time Chart */}
        {analytics && (
          <div className="pt-4 border-t border-[#EAE5DC]">
            <CollectionsChart analytics={analytics} />
          </div>
        )}

        {/* Clean navigation links */}
        <div className="pt-3 border-t border-[#EAE5DC] flex items-center justify-between text-xs">
          <Link
            to="/payments"
            className="text-[#0D5C56] font-medium hover:underline inline-flex items-center gap-1"
          >
            <span>View payments</span>
            <ArrowRight size={13} />
          </Link>

          <Link
            to="/outstanding"
            className="text-[#C45532] font-medium hover:underline inline-flex items-center gap-1"
          >
            <span>View outstanding</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
