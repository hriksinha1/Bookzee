import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CreditCard, CheckCircle2 } from 'lucide-react';
import { AttentionItem } from '../types';
import { fmtINR } from '../../../lib/utils/formatters';

interface AttentionQueueProps {
  items: AttentionItem[];
  onRecordPayment: (item: AttentionItem) => void;
}

export default function AttentionQueue({ items, onRecordPayment }: AttentionQueueProps) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#D8D2C5] text-sm text-[#5C6E6B]">
        <CheckCircle2 size={18} className="text-[#276749] shrink-0" />
        <span>Everything is up to date. Nothing needs action right now.</span>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C45532]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#C45532]">
            Needs Attention ({items.length})
          </h2>
        </div>
        <span className="text-xs text-[#5C6E6B]">Action required for guest checkouts & arrivals</span>
      </div>

      <div className="divide-y divide-[#EAE5DC] rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors"
          >
            {/* Left: WHO, WHERE, WHY */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base text-[#1A2B28]">{item.guestName}</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-stone-100 text-[#5C6E6B]">
                  {item.booking.booking_no}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF0EB] text-[#C45532] border border-[#F5DCAD]">
                  {item.isTodayCheckout ? 'Checkout today' : 'Arrival today'} · {fmtINR(item.dueAmount)} due
                </span>
              </div>

              <div className="text-xs text-[#5C6E6B] flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-[#1A2B28]">{item.propertyName}</span>
                <span>·</span>
                <span>{item.roomName}</span>
                <span>·</span>
                <span className="text-[#C45532]">{item.reason}</span>
              </div>
            </div>

            {/* Right: WHAT ACTION */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => onRecordPayment(item)}
                className="px-3 py-1.5 rounded-lg bg-[#C45532] text-white text-xs font-medium hover:bg-[#A84323] transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <CreditCard size={13} />
                <span>Record payment</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(`/bookings/${item.booking.id}`)}
                className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-[#1A2B28] text-xs font-medium hover:bg-stone-50 transition-colors flex items-center gap-1"
              >
                <span>Open booking</span>
                <ArrowUpRight size={13} className="text-[#5C6E6B]" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
