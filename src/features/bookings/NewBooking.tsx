import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  User,
  CreditCard,
  Building2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  UserPlus,
  ShieldCheck,
  Receipt,
  BedDouble,
  Info
} from 'lucide-react';
import { repository } from '../../lib/repository';
import { Property, Customer } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtINR } from '../../lib/utils/formatters';
import { useToast } from '../../context/ToastContext';

export default function NewBooking() {
  const navigate = useNavigate();
  const { propertyFilter } = useOutletContext<AppContextType>();
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [guests, setGuests] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Stay Details
  const [propertyId, setPropertyId] = useState(propertyFilter || '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState(1);
  const [guestsCount, setGuestsCount] = useState(2);
  const [roomType, setRoomType] = useState('Deluxe Chalet');
  const [nights, setNights] = useState(1);

  // Step 2: Guest Details
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [guestId, setGuestId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Step 3: Charges
  const [baseAmount, setBaseAmount] = useState<number | ''>(8500);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(12);
  const [discount, setDiscount] = useState<number | ''>(0);

  // Step 4: Optional Payment Received Now
  const [paymentType, setPaymentType] = useState<'No payment' | 'Advance' | 'Full payment'>('Advance');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>(3000);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    Promise.all([repository.getProperties(), repository.getCustomers()]).then(([pList, cList]) => {
      const active = pList.filter((p) => p.active);
      setProperties(active);
      setGuests(cList);
      if (!propertyId && active.length > 0) {
        setPropertyId(active[0].id);
      }
    });
  }, [propertyId]);

  // Set default dates if empty: tomorrow to 3 days later
  useEffect(() => {
    if (!checkIn) {
      const d = new Date();
      setCheckIn(d.toISOString().split('T')[0]);
      const next = new Date();
      next.setDate(next.getDate() + 2);
      setCheckOut(next.toISOString().split('T')[0]);
    }
  }, [checkIn]);

  useEffect(() => {
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      setNights(Math.max(1, diff));
    }
  }, [checkIn, checkOut]);

  // Calculate Financials
  const numBase = Number(baseAmount) || 0;
  const numDiscount = Number(discount) || 0;
  const subtotal = Math.max(0, numBase - numDiscount);
  const taxAmount = taxEnabled ? Math.round(subtotal * (taxRate / 100)) : 0;
  const totalBookingAmount = subtotal + taxAmount;

  useEffect(() => {
    if (paymentType === 'Full payment') {
      setPaymentAmount(totalBookingAmount);
    } else if (paymentType === 'No payment') {
      setPaymentAmount('');
    } else if (paymentType === 'Advance' && (paymentAmount === '' || paymentAmount === totalBookingAmount)) {
      setPaymentAmount(Math.round(totalBookingAmount * 0.3));
    }
  }, [paymentType, totalBookingAmount]);

  const numPayment = Number(paymentAmount) || 0;
  const initialDue = Math.max(0, totalBookingAmount - numPayment);

  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Validation
  const canProceedStep1 = propertyId && checkIn && checkOut && nights > 0;
  const canProceedStep2 = isNewGuest
    ? guestName.trim() && guestPhone.trim()
    : guestId.length > 0;
  const canProceedStep3 = numBase > 0;

  async function handleCreateBooking() {
    setLoading(true);
    try {
      // 1. Resolve guest ID
      let finalGuestId = guestId;
      if (isNewGuest) {
        const newG = await repository.createCustomer({
          name: guestName.trim(),
          phone: guestPhone.trim(),
          email: guestEmail.trim() || undefined
        });
        finalGuestId = newG.id;
      }

      // Generate booking number
      const bkNumber = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Create booking record
      const paymentStatus =
        numPayment >= totalBookingAmount
          ? 'Paid'
          : numPayment > 0
          ? 'Partially Paid'
          : 'Unpaid';

      const booking = await repository.createBooking({
        booking_no: bkNumber,
        customer_id: finalGuestId,
        property_id: propertyId,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        rooms,
        guests: guestsCount,
        room_type: roomType,
        base_amount: numBase,
        tax_enabled: taxEnabled,
        tax_rate: taxEnabled ? taxRate : 0,
        tax_amount: taxAmount,
        grand_total: totalBookingAmount,
        booking_status: 'Confirmed',
        payment_status: paymentStatus
      });

      // 3. Record initial payment if provided
      if (numPayment > 0 && paymentType !== 'No payment') {
        await repository.createPayment({
          payment_no: `PAY-${Math.floor(8000 + Math.random() * 2000)}`,
          booking_id: booking.id,
          date: new Date().toISOString().split('T')[0],
          amount: numPayment,
          method: paymentMethod,
          ref_id: paymentRef.trim() || undefined,
          purpose: paymentType === 'Full payment' ? 'Full payment' : 'Advance deposit',
          status: 'Recorded'
        });
      }

      toast.success('Booking Created Successfully', `Reservation ${bkNumber} has been confirmed.`);
      navigate(`/bookings/${booking.id}`);
    } catch (err: any) {
      toast.error('Could not create booking', err.message || 'Please verify form fields.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link
          to="/bookings"
          className="p-2 rounded-xl border border-[#D4DED9] bg-white text-[#5F716E] hover:text-[#18312F] hover:bg-[#FAF8F5] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
            Step {step} of 4
          </div>
          <h1 className="text-2xl font-semibold text-[#18312F] tracking-tight">New Stay Booking</h1>
        </div>
      </div>

      {/* Step Progress Pills */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { num: 1, label: 'Stay Details' },
          { num: 2, label: 'Guest' },
          { num: 3, label: 'Charges' },
          { num: 4, label: 'Payment' }
        ].map((s) => (
          <button
            key={s.num}
            disabled={step < s.num}
            onClick={() => setStep(s.num as any)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              step === s.num
                ? 'bg-[#E6F3F1] border-[#0F766E] text-[#0F766E]'
                : step > s.num
                ? 'bg-white border-[#BDE4CD] text-[#2F7D5A]'
                : 'bg-white/60 border-[#E8ECE9] text-stone-400'
            }`}
          >
            <div className="text-[11px] font-medium flex items-center gap-1.5">
              {step > s.num ? (
                <CheckCircle2 size={13} className="text-[#2F7D5A]" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center text-[10px]">
                  {s.num}
                </span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Two Column Layout: Form Left + Live Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-2 card p-6 bg-white border-[#D4DED9] space-y-6">
          {/* STEP 1: STAY DETAILS */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#18312F]">1. Stay & Room Selection</h3>
                <p className="text-xs text-[#5F716E] mt-0.5">
                  Select the host property, dates, and room occupancy.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                    Select Property <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="select text-sm"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.property_type}) - {p.city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                      Check-in Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                      Check-out Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                      Room Type
                    </label>
                    <input
                      type="text"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. Deluxe Suite"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                      Rooms
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={rooms}
                      onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                      Total Guests
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#E8ECE9]">
                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
                >
                  <span>Continue to Guest Details</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GUEST DETAILS */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#18312F]">2. Guest Information</h3>
                <p className="text-xs text-[#5F716E] mt-0.5">
                  Select an existing guest record or register a new traveler.
                </p>
              </div>

              {/* Toggle Existing vs New */}
              <div className="flex rounded-xl p-1 bg-[#FAF8F5] border border-[#D4DED9] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setIsNewGuest(false)}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    !isNewGuest
                      ? 'bg-white text-[#0F766E] shadow-2xs font-semibold'
                      : 'text-[#5F716E]'
                  }`}
                >
                  Select Existing Guest ({guests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewGuest(true)}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    isNewGuest ? 'bg-white text-[#0F766E] shadow-2xs font-semibold' : 'text-[#5F716E]'
                  }`}
                >
                  Register New Guest
                </button>
              </div>

              {!isNewGuest ? (
                <div>
                  <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                    Existing Guest Record <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    className="select text-sm"
                  >
                    <option value="">-- Choose guest --</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.phone}) {g.email ? `• ${g.email}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                      Guest Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Rohan Mehta"
                      className="input text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="guest@example.com"
                        className="input text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#E8ECE9]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-outline text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
                >
                  <span>Continue to Charges</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CHARGES */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#18312F]">3. Accommodation Charges</h3>
                <p className="text-xs text-[#5F716E] mt-0.5">
                  Set base tariff for the {nights} night(s) stay, taxes, and promotional discounts.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                    Accommodation Charges (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={baseAmount}
                    onChange={(e) =>
                      setBaseAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="input text-sm font-semibold"
                    placeholder="8500"
                  />
                  <p className="text-[11px] text-[#5F716E] mt-1">
                    Total base accommodation charges for {nights} night(s).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) =>
                      setDiscount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="input text-sm"
                    placeholder="0"
                  />
                </div>

                {/* GST Toggle */}
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8ECE9] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#18312F]">
                        GST / Taxes Applicable
                      </div>
                      <div className="text-[11px] text-[#5F716E]">
                        Enable to calculate and append tax invoice line items
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F766E]"></div>
                    </label>
                  </div>

                  {taxEnabled && (
                    <div className="pt-2 border-t border-[#E8ECE9] flex items-center justify-between gap-4">
                      <span className="text-xs text-[#18312F]">GST Rate:</span>
                      <select
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="text-xs bg-white border border-[#D4DED9] rounded-lg px-3 py-1 font-medium"
                      >
                        <option value={5}>5% (Budget tariff)</option>
                        <option value={12}>12% (Standard hotel tariff)</option>
                        <option value={18}>18% (Luxury / Resort tariff)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E8ECE9]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn btn-outline text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep3}
                  onClick={() => setStep(4)}
                  className="btn btn-primary text-xs sm:text-sm flex items-center gap-2"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: OPTIONAL PAYMENT RECEIVED NOW */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#18312F]">4. Initial Payment (Optional)</h3>
                <p className="text-xs text-[#5F716E] mt-0.5">
                  Record advance deposit received now, or leave as unpaid to collect at check-in.
                </p>
              </div>

              {/* Payment Type Selection */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'No payment', label: 'No Payment Now', desc: 'Pay at check-in' },
                  { id: 'Advance', label: 'Advance Deposit', desc: 'Partial payment' },
                  { id: 'Full payment', label: 'Full Payment', desc: 'Settle 100%' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentType(opt.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentType === opt.id
                        ? 'bg-[#E6F3F1] border-[#0F766E] text-[#0F766E]'
                        : 'bg-white border-[#D4DED9] text-[#18312F] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-[#5F716E] mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {paymentType !== 'No payment' && (
                <div className="space-y-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E8ECE9]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                        Amount Received Now (₹)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={totalBookingAmount}
                        value={paymentAmount}
                        onChange={(e) =>
                          setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="input text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="select text-sm"
                      >
                        <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                        <option value="Card">Credit / Debit Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#18312F] mb-1.5">
                      Transaction Reference / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. UPI Ref #8821901"
                      className="input text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-[#5F716E] p-3 rounded-xl bg-[#FAF8F5]">
                <Info size={16} className="text-[#0F766E] shrink-0" />
                <span>
                  You can record additional payments, checkout settlements, or generate PDF receipts
                  at any time from this booking's detail page.
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E8ECE9]">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn btn-outline text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCreateBooking}
                  className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 px-6 py-2.5 font-semibold"
                >
                  {loading ? (
                    <span>Confirming Reservation...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Create Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Stay Summary Card (Sidebar) */}
        <div className="card p-5 bg-[#FAF8F5] border-[#D4DED9] space-y-4 h-fit sticky top-24">
          <div className="border-b border-[#E8ECE9] pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
              Stay Summary
            </span>
            <h4 className="text-base font-bold text-[#18312F] mt-0.5">
              {selectedProperty?.name || 'Select Property'}
            </h4>
            <div className="text-xs text-[#5F716E]">
              {selectedProperty?.location || 'Property location'} • {roomType}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#5F716E]">Check-in:</span>
              <span className="font-semibold text-[#18312F]">{checkIn || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5F716E]">Check-out:</span>
              <span className="font-semibold text-[#18312F]">{checkOut || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5F716E]">Duration:</span>
              <span className="font-semibold text-[#18312F]">
                {nights} {nights === 1 ? 'night' : 'nights'} ({rooms} room, {guestsCount} guests)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5F716E]">Guest:</span>
              <span className="font-semibold text-[#18312F]">
                {isNewGuest
                  ? guestName || 'New Guest'
                  : guests.find((g) => g.id === guestId)?.name || 'Not selected'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8ECE9] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#5F716E]">
              <span>Accommodation Charges:</span>
              <span>{fmtINR(numBase)}</span>
            </div>
            {numDiscount > 0 && (
              <div className="flex justify-between text-[#2F7D5A]">
                <span>Discount:</span>
                <span>-{fmtINR(numDiscount)}</span>
              </div>
            )}
            {taxEnabled && (
              <div className="flex justify-between text-[#5F716E]">
                <span>GST ({taxRate}%):</span>
                <span>+{fmtINR(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-[#18312F] pt-2 border-t border-[#E8ECE9]">
              <span>Total Booking Amount:</span>
              <span>{fmtINR(totalBookingAmount)}</span>
            </div>
            {numPayment > 0 && (
              <div className="flex justify-between text-xs text-[#2F7D5A] font-medium pt-1">
                <span>Payment Now ({paymentType}):</span>
                <span>{fmtINR(numPayment)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-semibold text-[#B7791F] pt-1">
              <span>Amount Due:</span>
              <span>{fmtINR(initialDue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
