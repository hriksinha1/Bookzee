import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, IndianRupee } from 'lucide-react';
import { FinancialSnapshotData } from '../types';
import { fmtINR } from '../../../lib/utils/formatters';

interface FinancialSnapshotProps {
  data: FinancialSnapshotData;
}

export default function FinancialSnapshot({ data }: FinancialSnapshotProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1A2B28] flex items-center gap-1.5">
          <IndianRupee size={15} className="text-[#0D5C56]" />
          <span>Financial Snapshot</span>
        </h2>
        <span className="text-xs text-[#5C6E6B]">Summary of active portfolio receivables</span>
      </div>

      <div className="p-4 rounded-xl border border-[#D8D2C5] bg-white shadow-2xs space-y-4">
        {/* Compact Horizontal Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EAE5DC]">
          <div className="pt-2 sm:pt-0 sm:px-2 first:px-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6E6B]">
              Booking Value
            </span>
            <div className="text-xl font-bold text-[#1A2B28] mt-1 tracking-tight">
              {fmtINR(data.bookingValue)}
            </div>
            <p className="text-[11px] text-[#5C6E6B] mt-0.5">Total confirmed tariffs</p>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6E6B]">
              Collected
            </span>
            <div className="text-xl font-bold text-[#276749] mt-1 tracking-tight">
              {fmtINR(data.collected)}
            </div>
            <p className="text-[11px] text-[#5C6E6B] mt-0.5">
              {data.bookingValue > 0
                ? `${Math.round((data.collected / data.bookingValue) * 100)}% settled`
                : '100%'}
            </p>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6E6B]">
              Outstanding
            </span>
            <div className="text-xl font-bold text-[#C45532] mt-1 tracking-tight">
              {fmtINR(data.outstanding)}
            </div>
            <p className="text-[11px] text-[#5C6E6B] mt-0.5">Awaiting collection</p>
          </div>
        </div>

        {/* Navigation links */}
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
