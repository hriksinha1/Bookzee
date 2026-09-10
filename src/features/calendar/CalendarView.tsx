import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogIn,
  LogOut,
  BedDouble,
  CreditCard,
  Building2,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { repository } from '../../lib/repository';
import { Booking, Payment, Property } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtINR, fmtDate } from '../../lib/utils/formatters';
import { calculateBookingFinancials } from '../../lib/utils/financials';

type CalendarMode = 'month' | 'week' | 'day';

export default function CalendarView() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarMode>('month');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      repository.getBookings(propertyFilter || undefined),
      repository.getAllPayments(propertyFilter || undefined),
      repository.getProperties()
    ]).then(([bList, pList, propList]) => {
      setBookings(bList);
      setPayments(pList);
      setProperties(propList);
      setLoading(false);
    });
  }, [propertyFilter]);

  // Navigate calendar
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid calculations
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      const dateStr = curDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const todayStr = new Date().toISOString().split('T')[0];
    const days: Array<{ dateStr: string; dayName: string; dayNumber: number; isToday: boolean }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [currentDate]);

  // Map bookings to dates
  const getBookingsForDate = (dateStr: string) => {
    return bookings.filter((b) => {
      if (b.booking_status === 'Cancelled') return false;
      return dateStr >= b.check_in && dateStr <= b.check_out;
    });
  };

  const activePropName = properties.find((p) => p.id === propertyFilter)?.name;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-[#0F766E]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
              Operational Timeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
            Hospitality Calendar
          </h1>
          <p className="text-sm text-[#5F716E] mt-0.5">
            {propertyFilter ? `Stays at ${activePropName}` : 'Portfolio calendar across all active rooms'}
          </p>
        </div>

        {/* View Mode and New Stay */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Tabs */}
          <div className="flex items-center p-1 bg-white border border-[#D8D2C5] rounded-xl text-xs font-medium">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'month' ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold' : 'text-[#5C6E6B]'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'week' ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold' : 'text-[#5C6E6B]'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'day' ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold' : 'text-[#5C6E6B]'
              }`}
            >
              Day
            </button>
          </div>

          <button
            onClick={() => navigate('/bookings/new')}
            className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Navigation Controls & Month Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#D8D2C5]">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl hover:bg-[#F8F7F4] text-[#1A2B28] border border-[#D8D2C5] transition-colors"
            title="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#F8F7F4] hover:bg-[#E8F3F1] text-[#1A2B28] border border-[#D8D2C5] transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl hover:bg-[#F8F7F4] text-[#1A2B28] border border-[#D8D2C5] transition-colors"
            title="Next"
          >
            <ChevronRight size={18} />
          </button>

          <h2 className="text-base sm:text-lg font-bold text-[#1A2B28] ml-2">
            {currentDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
              ...(viewMode === 'day' ? { day: 'numeric', weekday: 'short' } : {})
            })}
          </h2>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-[#5C6E6B] flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0D5C56]" /> Confirmed Stay
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C45532]" /> Payment Due
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8E9E9B]" /> Checked Out
          </span>
        </div>
      </div>

      {/* Main Calendar Viewport */}
      {viewMode === 'month' && (
        <div className="card overflow-hidden bg-white border-[#D8D2C5]">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-[#EAE5DC] bg-[#FAF9F6] text-center text-xs font-semibold text-[#5C6E6B] py-2.5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#EAE5DC]">
            {monthDays.map((day) => {
              const dayBookings = getBookingsForDate(day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-[#FAF9F6]/60 text-stone-400'
                  } ${day.isToday ? 'ring-2 ring-[#0D5C56] ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                        day.isToday
                          ? 'bg-[#0D5C56] text-white font-bold'
                          : day.isCurrentMonth
                          ? 'text-[#1A2B28]'
                          : 'text-stone-400'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-[10px] font-medium text-[#5C6E6B]">
                        {dayBookings.length} {dayBookings.length === 1 ? 'stay' : 'stays'}
                      </span>
                    )}
                  </div>

                  {/* Day Booking Chips */}
                  <div className="mt-1 space-y-1 overflow-hidden flex-1">
                    {dayBookings.slice(0, 2).map((b) => {
                      const isCheckIn = b.check_in === day.dateStr;
                      const isCheckOut = b.check_out === day.dateStr;
                      const bPayments = payments.filter((p) => p.booking_id === b.id);
                      const fin = calculateBookingFinancials(b, bPayments);

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium truncate cursor-pointer transition-all border ${
                            b.booking_status === 'Checked Out'
                              ? 'bg-stone-100 text-stone-600 border-stone-200'
                              : fin.paymentStatus === 'Unpaid' || fin.paymentStatus === 'Partially Paid'
                              ? 'bg-[#FAF0EB] text-[#C45532] border-[#F5DCAD] hover:bg-[#F5E5DC]'
                              : 'bg-[#E8F3F1] text-[#0D5C56] border-[#BDDFC9] hover:bg-[#D5EFEA]'
                          }`}
                          title={`${b.customer?.name || 'Guest'} (${b.booking_no}) • ${b.room_type}`}
                        >
                          <div className="flex items-center gap-1">
                            {isCheckIn && <LogIn size={11} className="shrink-0" />}
                            {isCheckOut && <LogOut size={11} className="shrink-0" />}
                            <span className="truncate">{b.customer?.name}</span>
                          </div>
                        </div>
                      );
                    })}

                    {dayBookings.length > 2 && (
                      <button
                        onClick={() => {
                          setCurrentDate(new Date(day.dateStr));
                          setViewMode('day');
                        }}
                        className="text-[10px] text-[#0D5C56] font-medium pl-1 hover:underline block"
                      >
                        +{dayBookings.length - 2} more stays
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="card overflow-hidden bg-white border-[#D8D2C5]">
          <div className="grid grid-cols-7 border-b border-[#EAE5DC] divide-x divide-[#EAE5DC]">
            {weekDays.map((w) => {
              const dayBookings = getBookingsForDate(w.dateStr);

              return (
                <div
                  key={w.dateStr}
                  className={`p-3 min-h-[360px] flex flex-col ${
                    w.isToday ? 'bg-[#E8F3F1]/30' : 'bg-white'
                  }`}
                >
                  <div className="border-b border-[#EAE5DC] pb-2 mb-3 text-center">
                    <div className="text-xs text-[#5C6E6B] font-medium">{w.dayName}</div>
                    <div
                      className={`text-lg font-bold mt-0.5 inline-flex w-8 h-8 rounded-full items-center justify-center ${
                        w.isToday ? 'bg-[#0D5C56] text-white' : 'text-[#1A2B28]'
                      }`}
                    >
                      {w.dayNumber}
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    {dayBookings.map((b) => {
                      const isCheckIn = b.check_in === w.dateStr;
                      const isCheckOut = b.check_out === w.dateStr;
                      const bPayments = payments.filter((p) => p.booking_id === b.id);
                      const fin = calculateBookingFinancials(b, bPayments);

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className="p-2.5 rounded-xl border border-[#D8D2C5] bg-white hover:border-[#0D5C56] shadow-2xs hover:shadow-xs cursor-pointer transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[#1A2B28] truncate">
                              {b.customer?.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 font-mono">
                              {b.booking_no}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#5C6E6B] truncate">{b.room_type}</div>
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#EAE5DC]">
                            <span
                              className={`px-1.5 py-0.5 rounded font-medium ${
                                fin.paymentStatus === 'Paid'
                                  ? 'bg-[#EBF6EF] text-[#276749]'
                                  : 'bg-[#FAF0EB] text-[#C45532]'
                              }`}
                            >
                              {fin.paymentStatus}
                            </span>
                            <span className="font-semibold">{fmtINR(b.grand_total)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {dayBookings.length === 0 && (
                      <div className="text-center py-10 text-xs text-stone-400">No stays</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="card p-6 bg-white border-[#D8D2C5] space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#18312F]">
                Operations on {fmtDate(currentDate.toISOString().split('T')[0])}
              </h3>
              <p className="text-xs text-[#5F716E] mt-0.5">
                Stays, arrivals, and departures active on this day
              </p>
            </div>
            <span className="text-sm font-semibold text-[#0F766E]">
              {getBookingsForDate(currentDate.toISOString().split('T')[0]).length} Stays Scheduled
            </span>
          </div>

          <div className="space-y-3">
            {getBookingsForDate(currentDate.toISOString().split('T')[0]).map((b) => {
              const dateStr = currentDate.toISOString().split('T')[0];
              const isArrival = b.check_in === dateStr;
              const isDeparture = b.check_out === dateStr;
              const bPayments = payments.filter((p) => p.booking_id === b.id);
              const fin = calculateBookingFinancials(b, bPayments);

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className="p-4 rounded-xl border border-[#D8D2C5] hover:border-[#0D5C56] transition-all bg-[#FAF9F6] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-[#1A2B28]">
                        {b.customer?.name || 'Guest'}
                      </span>
                      <span className="text-xs font-mono text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {b.booking_no}
                      </span>
                      {isArrival && (
                        <span className="badge bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]">
                          Arriving Today
                        </span>
                      )}
                      {isDeparture && (
                        <span className="badge bg-[#FAF0EB] text-[#C45532] border border-[#F5DCAD]">
                          Departing Today
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#5C6E6B]">
                      {b.property?.name} • {b.room_type} • {b.nights} nights
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-sm text-[#1A2B28]">{fmtINR(b.grand_total)}</div>
                      <div className="text-xs text-[#5C6E6B]">
                        {fin.amountDue > 0 ? (
                          <span className="text-[#C45532] font-semibold">
                            Due: {fmtINR(fin.amountDue)}
                          </span>
                        ) : (
                          <span className="text-[#276749]">Paid in Full</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/bookings/${b.id}`);
                      }}
                      className="btn btn-outline text-xs"
                    >
                      View Booking
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Booking Preview Modal */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56]">
                  Stay Preview
                </span>
                <h3 className="text-xl font-bold text-[#1A2B28] mt-1">
                  {selectedBooking.customer?.name}
                </h3>
                <p className="text-xs text-[#5C6E6B] font-mono">{selectedBooking.booking_no}</p>
              </div>
              <span className="badge bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9]">
                {selectedBooking.booking_status}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5C6E6B]">Property:</span>
                <span className="font-medium text-[#1A2B28]">{selectedBooking.property?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6E6B]">Room Type:</span>
                <span className="font-medium text-[#1A2B28]">{selectedBooking.room_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C6E6B]">Stay Duration:</span>
                <span className="font-medium text-[#1A2B28]">
                  {fmtDate(selectedBooking.check_in)} – {fmtDate(selectedBooking.check_out)} (
                  {selectedBooking.nights} nights)
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#EAE5DC]">
                <span className="text-[#5C6E6B]">Total Booking Amount:</span>
                <span className="font-bold text-sm text-[#1A2B28]">
                  {fmtINR(selectedBooking.grand_total)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="btn btn-outline text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigate(`/bookings/${selectedBooking.id}`);
                }}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <span>Full Booking Detail</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
