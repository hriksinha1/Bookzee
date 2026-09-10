import React from 'react';
import { LogOut } from 'lucide-react';
import { Booking, Payment } from '../../../lib/repository/types';
import DepartureRow from './DepartureRow';

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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#EAE5DC]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1A2B28] flex items-center gap-1.5">
          <LogOut size={13} className="text-[#C45532]" />
          <span>Departures ({departures.length})</span>
        </h3>
        <span className="text-[11px] text-[#5C6E6B]">Standard 11:00 AM</span>
      </div>

      {departures.length === 0 ? (
        <div className="py-8 px-4 text-center text-xs text-[#5C6E6B]">
          No departures today.
        </div>
      ) : (
        <div className="divide-y divide-[#EAE5DC]">
          {departures.map((b) => (
            <DepartureRow
              key={b.id}
              booking={b}
              payments={paymentsByBookingId.get(b.id) || []}
              onCheckOut={onCheckOut}
              onRecordPayment={onRecordPayment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
