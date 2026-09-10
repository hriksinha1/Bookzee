import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AttentionItem } from '../types';
import NeedsActionRow from './NeedsActionRow';

interface NeedsActionSectionProps {
  items: AttentionItem[];
  onRecordPayment: (item: AttentionItem) => void;
}

export default function NeedsActionSection({
  items,
  onRecordPayment
}: NeedsActionSectionProps) {
  if (items.length === 0) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#5C6E6B]">
          <span>Needs action</span>
          <span>0 items</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#D8D2C5] bg-white text-xs text-[#5C6E6B]">
          <CheckCircle2 size={16} className="text-[#276749] shrink-0" />
          <span>Nothing needs your attention.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#C45532] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C45532]" />
          <span>Needs action</span>
        </h2>
        <span className="text-xs font-medium text-[#5C6E6B]">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="rounded-xl border border-[#D8D2C5] bg-white divide-y divide-[#EAE5DC] overflow-hidden shadow-2xs">
        {items.map((item) => (
          <NeedsActionRow
            key={item.id}
            item={item}
            onRecordPayment={onRecordPayment}
          />
        ))}
      </div>
    </section>
  );
}
