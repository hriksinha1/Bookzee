import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowUpRight } from 'lucide-react';
import { AttentionItem } from '../types';
import { fmtINR } from '../../../lib/utils/formatters';

interface NeedsActionRowProps {
  key?: React.Key;
  item: AttentionItem;
  onRecordPayment: (item: AttentionItem) => void;
}

export default function NeedsActionRow({ item, onRecordPayment }: NeedsActionRowProps) {
  const navigate = useNavigate();

  return (
    <div className="py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors">
      {/* Left: Guest, Reason, Property/Stay, Amount Due */}
      <div className="space-y-1 min-w-0">
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <span className="font-semibold text-sm text-[#1A2B28]">{item.guestName}</span>
          <span className="text-xs font-medium text-[#C45532]">
            {item.reason}
          </span>
        </div>

        <div className="text-xs text-[#5C6E6B] flex items-center gap-2 flex-wrap">
          <span>{item.propertyName} · {item.roomName}</span>
          <span>·</span>
          <span className="font-semibold text-[#C45532]">
            {fmtINR(item.dueAmount)} due
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onRecordPayment(item)}
          className="px-3 py-1.5 rounded-lg bg-[#C45532] text-white text-xs font-medium hover:bg-[#A84323] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <CreditCard size={13} />
          <span>Record payment</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/bookings/${item.booking.id}`)}
          className="px-2.5 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#1A2B28] hover:bg-stone-50 transition-colors inline-flex items-center gap-1"
        >
          <span>View booking</span>
          <ArrowUpRight size={13} className="text-[#5C6E6B]" />
        </button>
      </div>
    </div>
  );
}
