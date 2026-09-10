import React, { useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { AppContextType } from '../../components/layout/AppShell';
import { useOverviewData } from './hooks/useOverviewData';
import AttentionQueue from './components/AttentionQueue';
import TodaySummary from './components/TodaySummary';
import ArrivalsList from './components/ArrivalsList';
import DeparturesList from './components/DeparturesList';
import InHouseList from './components/InHouseList';
import FinancialSnapshot from './components/FinancialSnapshot';
import ActivityList from './components/ActivityList';
import AddPaymentModal from '../bookings/AddPaymentModal';
import { Booking } from '../../lib/repository/types';
import { repository } from '../../lib/repository';
import { useToast } from '../../context/ToastContext';
import { AttentionItem } from './types';

export default function OverviewPage() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    loading,
    error,
    refresh,
    paymentsByBookingId,
    attentionItems,
    todayMetrics,
    financialSnapshot,
    activityFeed
  } = useOverviewData(propertyFilter);

  // Payment recording modal state
  const [paymentModalData, setPaymentModalData] = useState<{
    booking: Booking;
    balanceDue: number;
  } | null>(null);

  // Format today date calmly
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  // Quick check-in handler
  const handleCheckIn = async (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked In' });
      toast.success('Guest Checked In', `${booking.customer?.name || 'Guest'} marked as checked in.`);
      refresh();
    } catch {
      toast.error('Check-in Failed', 'Could not update booking status.');
    }
  };

  // Quick check-out handler
  const handleCheckOut = async (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked Out' });
      toast.success('Guest Checked Out', `${booking.customer?.name || 'Guest'} marked as checked out.`);
      refresh();
    } catch {
      toast.error('Check-out Failed', 'Could not update booking status.');
    }
  };

  // Record payment trigger
  const handleRecordPayment = (booking: Booking, dueAmount: number) => {
    setPaymentModalData({
      booking,
      balanceDue: dueAmount
    });
  };

  const handleAttentionRecordPayment = (item: AttentionItem) => {
    setPaymentModalData({
      booking: item.booking,
      balanceDue: item.dueAmount
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-12 w-64 bg-stone-200/80 rounded-xl" />
        <div className="h-24 bg-white rounded-xl border border-[#D8D2C5]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-xl border border-[#D8D2C5]" />
          <div className="h-64 bg-white rounded-xl border border-[#D8D2C5]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-xl border border-[#D8D2C5] bg-white text-center space-y-3">
        <AlertCircle size={28} className="mx-auto text-[#C45532]" />
        <p className="text-sm font-semibold text-[#1A2B28]">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-8">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE5DC]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Overview
          </h1>
          <p className="text-sm font-medium text-[#5C6E6B] mt-0.5">
            {todayFormatted} · Your property's operational picture for today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/calendar"
            className="px-3.5 py-2 rounded-xl border border-[#D8D2C5] text-xs font-medium text-[#1A2B28] bg-white hover:bg-[#FAF9F6] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <CalendarIcon size={15} className="text-[#0D5C56]" />
            <span>Calendar</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate('/bookings/new')}
            className="px-4 py-2 rounded-xl bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus size={15} />
            <span>New Booking</span>
          </button>
        </div>
      </header>

      {/* LEVEL 1: SECTION A — NEEDS ATTENTION */}
      <AttentionQueue
        items={attentionItems}
        onRecordPayment={handleAttentionRecordPayment}
      />

      {/* LEVEL 2: SECTION B — TODAY */}
      <section className="space-y-4">
        <TodaySummary metrics={todayMetrics} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Arrivals List */}
          <ArrivalsList
            arrivals={todayMetrics.arrivals}
            paymentsByBookingId={paymentsByBookingId}
            onCheckIn={handleCheckIn}
          />

          {/* Departures List */}
          <DeparturesList
            departures={todayMetrics.departures}
            paymentsByBookingId={paymentsByBookingId}
            onCheckOut={handleCheckOut}
            onRecordPayment={handleRecordPayment}
          />
        </div>
      </section>

      {/* LEVEL 3: SECTION C — CURRENTLY IN-HOUSE */}
      <InHouseList
        inHouse={todayMetrics.inHouse}
        paymentsByBookingId={paymentsByBookingId}
      />

      {/* LEVEL 4 & 5: FINANCIAL SNAPSHOT & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <FinancialSnapshot data={financialSnapshot} />
        </div>

        <div className="lg:col-span-1">
          <ActivityList events={activityFeed} />
        </div>
      </div>

      {/* Add Payment Modal */}
      {paymentModalData && (
        <AddPaymentModal
          booking={paymentModalData.booking}
          balanceDue={paymentModalData.balanceDue}
          onClose={() => setPaymentModalData(null)}
          onSuccess={() => {
            setPaymentModalData(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
