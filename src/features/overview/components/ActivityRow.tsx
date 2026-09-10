import React from 'react';
import { CreditCard, Calendar } from 'lucide-react';
import { ActivityEvent } from '../types';

interface ActivityRowProps {
  key?: React.Key;
  event: ActivityEvent;
}

export default function ActivityRow({ event }: ActivityRowProps) {
  return (
    <div className="py-2.5 px-3.5 flex items-start justify-between gap-3 text-xs hover:bg-[#FAF9F6] transition-colors">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="mt-0.5 text-[#5C6E6B] shrink-0">
          {event.type === 'booking' ? <Calendar size={13} /> : <CreditCard size={13} />}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-[#1A2B28] truncate">{event.title}</div>
          <div className="text-[11px] text-[#7E8F8C] truncate">{event.subtitle}</div>
        </div>
      </div>

      <span className="text-[11px] text-[#7E8F8C] shrink-0">{event.time}</span>
    </div>
  );
}
