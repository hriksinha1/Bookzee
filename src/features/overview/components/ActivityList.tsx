import React from 'react';
import { ActivityEvent } from '../types';
import ActivityRow from './ActivityRow';

interface ActivityListProps {
  events: ActivityEvent[];
}

export default function ActivityList({ events }: ActivityListProps) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28]">
          Recent activity
        </h2>
        <span className="text-xs text-[#5C6E6B]">Latest events</span>
      </div>

      <div className="rounded-xl border border-[#D8D2C5] bg-white overflow-hidden shadow-2xs">
        {events.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs text-[#5C6E6B]">
            No recent activity.
          </div>
        ) : (
          <div className="divide-y divide-[#EAE5DC]">
            {events.map((ev) => (
              <ActivityRow key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
