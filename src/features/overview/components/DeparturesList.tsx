import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CreditCard, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR } from '../../../lib/utils/formatters';

interface DeparturesListProps {
  departures: Booking[];
  paymentsByBookingId: Map<string, Payment[]>;
  onCheckOut: (booking: Booking, e: React.MouseEvent) => void;
  onRecordPayment: (booking: Booking, dueAmount: number) => void;
}

export default function DeparturesList({
  departures,
  paymentsByBookingId,
  onCheckOut,
  onRecordPayment
}: DeparturesListProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1A2B28] uppercase tracking-wider flex items-center gap-1.5">
          <LogOut size={15} className="text-[#C45532]" />
          <span>Today's Departures ({departures.length})</span>
        </h3>
        {departures.length > 0 && (
          <span className="text-xs text-[#5C6E6B]">Standard checkout · 11:00 AM</span>
        )}
      </div>

      {departures.length === 0 ? (
        <div className="py-6 px-4 rounded-xl border border-[#D8D2C5] bg-white text-center text-xs text-[#5C6E6B]">
          No departures today.
        </div>
      ) : (
        <div className="divide-y divide-[#EAE5DC] rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
          {departures.map((b) => {
            const bPayments = paymentsByBookingId.get(b.id) || [];
            const fin = calculateBookingFinancials(b, bPayments);
            const isCheckedOut = b.booking_status === 'Checked Out';
            const hasDue = fin.amountDue > 0;

            return (
              <div
                key={b.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors"
              >
                {/* Guest & Room Details */}
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#1A2B28]">
                      {b.customer?.name || 'Guest'}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono bg-stone-100 text-[#5C6E6B]">
                      {b.booking_no}
                    </span>
                    {isCheckedOut ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                        Checked out
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#FAF0EB] text-[#C45532] font-medium">
                        Checkout pending
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#5C6E6B] flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[#1A2B28]">{b.property?.name}</span>
                    <span>·</span>
                    <span>{b.room_type}</span>
                    <span>·</span>
                    <span>11:00 AM</span>
                  </div>
                </div>

                {/* Amount Due & Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[#1A2B28]">
                      {hasDue ? (
                        <span className="text-[#C45532] font-bold">{fmtINR(fin.amountDue)} due</span>
                      ) : (
                        <span className="text-[#276749] font-medium">Paid in full</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5C6E6B]">
                      Total: {fmtINR(b.grand_total)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasDue && (
                      <button
                        type="button"
                        onClick={() => onRecordPayment(b, fin.amountDue)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#C45532] text-white text-xs font-medium hover:bg-[#A84323] transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <CreditCard size={12} />
                        <span>Record payment</span>
                      </button>
                    )}

                    {!isCheckedOut ? (
                      <button
                        type="button"
                        onClick={(e) => onCheckOut(b, e)}
                        className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-[#1A2B28] text-xs font-medium hover:bg-stone-50 transition-colors shadow-2xs"
                      >
                        Check out
                      </button>
                    ) : (
                      <span className="text-xs text-[#5C6E6B] px-2 py-1">Completed</span>
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
