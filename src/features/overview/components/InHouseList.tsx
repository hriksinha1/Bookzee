import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR, fmtDate } from '../../../lib/utils/formatters';

interface InHouseListProps {
  inHouse: Booking[];
  paymentsByBookingId: Map<string, Payment[]>;
}

export default function InHouseList({ inHouse, paymentsByBookingId }: InHouseListProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // Show first 4 by default, allow expanding if more
  const displayed = expanded ? inHouse : inHouse.slice(0, 4);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble size={16} className="text-[#0D5C56]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1A2B28]">
            Currently In-House ({inHouse.length})
          </h2>
        </div>
        <span className="text-xs text-[#5C6E6B]">Active resident guests across properties</span>
      </div>

      {inHouse.length === 0 ? (
        <div className="py-6 px-4 rounded-xl border border-[#D8D2C5] bg-white text-center text-xs text-[#5C6E6B]">
          No guests currently in-house.
        </div>
      ) : (
        <div className="rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
          <div className="divide-y divide-[#EAE5DC]">
            {displayed.map((b) => {
              const bPayments = paymentsByBookingId.get(b.id) || [];
              const fin = calculateBookingFinancials(b, bPayments);

              return (
                <div
                  key={b.id}
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors">
                        {b.customer?.name || 'Guest'}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-stone-100 text-[#5C6E6B]">
                        {b.booking_no}
                      </span>
                      <span className="text-xs text-[#5C6E6B]">
                        Checkout: {fmtDate(b.check_out)}
                      </span>
                    </div>

                    <div className="text-xs text-[#5C6E6B] flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-[#1A2B28]">{b.property?.name}</span>
                      <span>·</span>
                      <span>{b.room_type}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-[#1A2B28]">
                        {fmtINR(b.grand_total)}
                      </div>
                      <div className="text-[11px]">
                        {fin.amountDue === 0 ? (
                          <span className="text-[#276749]">Paid in full</span>
                        ) : (
                          <span className="text-[#C45532]">Due: {fmtINR(fin.amountDue)}</span>
                        )}
                      </div>
                    </div>

                    <ArrowUpRight
                      size={15}
                      className="text-[#5C6E6B] group-hover:text-[#0D5C56] group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {inHouse.length > 4 && (
            <div className="p-2.5 bg-[#FAF9F6] border-t border-[#EAE5DC] text-center">
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs font-medium text-[#0D5C56] hover:underline inline-flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    <span>Show fewer stays</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>View all {inHouse.length} in-house stays</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
