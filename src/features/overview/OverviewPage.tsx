import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppContextType } from '../../components/layout/AppShell';
import { useOverviewData } from './hooks/useOverviewData';
import OverviewHeader from './components/OverviewHeader';
import TodaySection from './components/TodaySection';
import InHouseSection from './components/InHouseSection';
import AddPaymentModal from '../bookings/AddPaymentModal';
import { Booking } from '../../lib/repository/types';
import { repository } from '../../lib/repository';
import { useToast } from '../../context/ToastContext';

export default function OverviewPage() {
  const { propertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    loading,
    error,
    refresh,
    paymentsByBookingId,
    todayMetrics
  } = useOverviewData(propertyFilter);

  // Payment recording modal state
  const [paymentModalData, setPaymentModalData] = useState<{
    booking: Booking;
    balanceDue: number;
  } | null>(null);

  // Quick check-in handler
  const handleCheckIn = async (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await repository.updateBooking(booking.id, { booking_status: 'Checked In' });
      toast.success('Guest Checked In', `${booking.customer?.name || 'Guest'} checked in.`);
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
      toast.success('Guest Checked Out', `${booking.customer?.name || 'Guest'} checked out.`);
      refresh();
    } catch {
      toast.error('Check-out Failed', 'Could not update booking status.');
    }
  };

  // Record payment triggers
  const handleRecordPayment = (booking: Booking, dueAmount: number) => {
    setPaymentModalData({
      booking,
      balanceDue: dueAmount
    });
  };

  // Skeleton Loading State
  if (loading) {
    return (
      <div className="space-y-7 max-w-7xl xl:max-w-[1320px] mx-auto pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-baseline pb-2 border-b border-[#EAE5DC]">
          <div className="space-y-2">
            <div className="h-8 w-36 bg-stone-200 rounded-lg" />
            <div className="h-4 w-64 bg-stone-200/70 rounded-md" />
          </div>
          <div className="flex gap-2.5">
            <div className="h-9 w-24 bg-stone-200 rounded-lg" />
            <div className="h-9 w-28 bg-stone-200 rounded-lg" />
          </div>
        </div>

        {/* Today Skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-40 bg-stone-200 rounded-md" />
          <div className="h-64 rounded-xl border border-[#D8D2C5] bg-white" />
        </div>

        {/* In-House Skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-36 bg-stone-200 rounded-md" />
          <div className="h-32 rounded-xl border border-[#D8D2C5] bg-white" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 rounded-xl border border-[#D8D2C5] bg-white text-center space-y-3 shadow-2xs">
        <AlertCircle size={28} className="mx-auto text-[#C45532]" />
        <p className="text-sm font-semibold text-[#1A2B28]">Couldn't load today's operations.</p>
        <button
          type="button"
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshCw size={14} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-7xl xl:max-w-[1320px] mx-auto pb-12">
      {/* 1. HEADER */}
      <OverviewHeader onNewBooking={() => navigate('/bookings/new')} />

      {/* 2. TODAY (Primary Operational Workspace) */}
      <TodaySection
        metrics={todayMetrics}
        paymentsByBookingId={paymentsByBookingId}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onRecordPayment={handleRecordPayment}
      />

      {/* 3. CURRENTLY IN-HOUSE (Reference Stays) */}
      <InHouseSection
        inHouse={todayMetrics.inHouse}
        paymentsByBookingId={paymentsByBookingId}
      />

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
