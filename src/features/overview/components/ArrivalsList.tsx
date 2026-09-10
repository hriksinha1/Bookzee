import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR } from '../../../lib/utils/formatters';

interface ArrivalsListProps {
  arrivals: Booking[];
  paymentsByBookingId: Map<string, Payment[]>;
  onCheckIn: (booking: Booking, e: React.MouseEvent) => void;
}

export default function ArrivalsList({
  arrivals,
  paymentsByBookingId,
  onCheckIn
}: ArrivalsListProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1A2B28] uppercase tracking-wider flex items-center gap-1.5">
          <LogIn size={15} className="text-[#0D5C56]" />
          <span>Today's Arrivals ({arrivals.length})</span>
        </h3>
        {arrivals.length > 0 && (
          <span className="text-xs text-[#5C6E6B]">Check-in window open</span>
        )}
      </div>

      {arrivals.length === 0 ? (
        <div className="py-6 px-4 rounded-xl border border-[#D8D2C5] bg-white text-center text-xs text-[#5C6E6B]">
          No arrivals today.
        </div>
      ) : (
        <div className="divide-y divide-[#EAE5DC] rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
          {arrivals.map((b) => {
            const bPayments = paymentsByBookingId.get(b.id) || [];
            const fin = calculateBookingFinancials(b, bPayments);
            const isCheckedIn = b.booking_status === 'Checked In';

            return (
              <div
                key={b.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors"
              >
                {/* Guest & Stay Details */}
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#1A2B28]">
                      {b.customer?.name || 'Guest'}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-stone-100 text-[#5C6E6B]">
                      {b.booking_no}
                    </span>
                    {isCheckedIn ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9] font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Checked in
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-medium">
                        Expected today
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#5C6E6B] flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[#1A2B28]">{b.property?.name}</span>
                    <span>·</span>
                    <span>{b.room_type}</span>
                    <span>·</span>
                    <span>{b.nights} {b.nights === 1 ? 'night' : 'nights'}</span>
                  </div>
                </div>

                {/* Financial Status & Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[#1A2B28]">
                      {fmtINR(b.grand_total)}
                    </div>
                    <div className="text-[11px]">
                      {fin.amountDue === 0 ? (
                        <span className="text-[#276749] font-medium">Paid</span>
                      ) : fin.paid > 0 ? (
                        <span className="text-[#B7791F] font-medium">Partially paid</span>
                      ) : (
                        <span className="text-[#C45532] font-medium">Unpaid ({fmtINR(fin.amountDue)})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isCheckedIn && (
                      <button
                        type="button"
                        onClick={(e) => onCheckIn(b, e)}
                        className="px-3 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors shadow-2xs"
                      >
                        Check in
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/bookings/${b.id}`)}
                      className="p-1.5 rounded-lg border border-[#D8D2C5] text-[#5C6E6B] hover:text-[#1A2B28] hover:bg-stone-50 transition-colors"
                      title="Open booking"
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
