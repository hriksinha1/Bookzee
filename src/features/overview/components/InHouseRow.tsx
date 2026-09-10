import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import { calculateBookingFinancials } from '../../../lib/utils/financials';
import { fmtINR, fmtDate } from '../../../lib/utils/formatters';

interface InHouseRowProps {
  key?: React.Key;
  booking: Booking;
  payments: Payment[];
}

export default function InHouseRow({ booking, payments }: InHouseRowProps) {
  const navigate = useNavigate();
  const fin = calculateBookingFinancials(booking, payments);

  return (
    <div
      onClick={() => navigate(`/bookings/${booking.id}`)}
      className="py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#FAF9F6] transition-colors cursor-pointer group select-none"
    >
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-baseline gap-2.5">
          <span className="font-semibold text-sm text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors truncate">
            {booking.customer?.name || 'Guest'}
          </span>
          <span className="text-xs text-[#7E8F8C]">
            Checkout {fmtDate(booking.check_out)}
          </span>
        </div>

        <div className="text-[13px] text-[#5C6E6B]">
          {booking.property?.name} · {booking.room_type}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
        <div className="text-left sm:text-right">
          <div className="text-xs font-semibold text-[#1A2B28]">
            {fmtINR(booking.grand_total)}
          </div>
          <div className="text-[11px] font-medium">
            {fin.amountDue === 0 ? (
              <span className="text-[#276749]">Paid in full</span>
            ) : (
              <span className="text-[#C45532]">{fmtINR(fin.amountDue)} due</span>
            )}
          </div>
        </div>

        <ArrowUpRight
          size={14}
          className="text-[#7E8F8C] group-hover:text-[#0D5C56] group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </div>
  );
}
