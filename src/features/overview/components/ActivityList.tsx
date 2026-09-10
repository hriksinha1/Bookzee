import React from 'react';
import { Clock, CreditCard, Calendar } from 'lucide-react';
import { ActivityEvent } from '../types';

interface ActivityListProps {
  events: ActivityEvent[];
}

export default function ActivityList({ events }: ActivityListProps) {
  if (events.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1A2B28] flex items-center gap-1.5">
          <Clock size={15} className="text-[#5C6E6B]" />
          <span>Recent Activity</span>
        </h2>
        <span className="text-xs text-[#5C6E6B]">Audit stream</span>
      </div>

      <div className="divide-y divide-[#EAE5DC] rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
        {events.map((ev) => (
          <div key={ev.id} className="p-3 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 p-1 rounded-md bg-[#FAF9F6] text-[#5C6E6B] shrink-0 border border-[#EAE5DC]">
                {ev.type === 'booking' ? <Calendar size={13} /> : <CreditCard size={13} />}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[#1A2B28] truncate">{ev.title}</div>
                <div className="text-[#5C6E6B] truncate">{ev.subtitle}</div>
              </div>
            </div>

            <span className="text-[11px] text-[#5C6E6B] shrink-0">{ev.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
