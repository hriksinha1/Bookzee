import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Customer, Booking, Payment, Property } from '../../lib/repository/types';
import { fmtDate, fmtINR } from '../../lib/utils/formatters';
import {
  Search,
  Users,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Calendar,
  Building2,
  ExternalLink,
  X,
  CreditCard,
  UserCheck,
  ArrowRight,
  MessageSquare,
  Edit3,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  Receipt
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CustomersList() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Customer | null>(null);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [isEditingGuest, setIsEditingGuest] = useState(false);

  // New Guest Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newIdType, setNewIdType] = useState('Aadhaar');
  const [newIdNumber, setNewIdNumber] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [savingGuest, setSavingGuest] = useState(false);

  // Edit Guest Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIdType, setEditIdType] = useState('Aadhaar');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updatingGuest, setUpdatingGuest] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cList, bList, pList, payList] = await Promise.all([
        repository.getCustomers(),
        repository.getBookings(),
        repository.getProperties(),
        repository.getPayments()
      ]);
      setCustomers(cList);
      setBookings(bList);
      setProperties(pList);
      setPayments(payList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Sync edit form when selectedGuest changes
  useEffect(() => {
    if (selectedGuest) {
      setEditName(selectedGuest.name);
      setEditPhone(selectedGuest.phone);
      setEditEmail(selectedGuest.email || '');
      setEditIdType(selectedGuest.id_type || 'Aadhaar');
      setEditIdNumber(selectedGuest.id_number || '');
      setEditCity(selectedGuest.city || '');
      setEditAddress(selectedGuest.address || '');
      setEditNotes(selectedGuest.notes || '');
      setIsEditingGuest(false);
    }
  }, [selectedGuest]);

  // Compute guest stay statistics
  const guestStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const stats: Record<
      string,
      {
        staysCount: number;
        totalSpent: number;
        lastStay?: Booking;
        activeStay?: Booking;
      }
    > = {};

    customers.forEach((c) => {
      stats[c.id] = { staysCount: 0, totalSpent: 0 };
    });

    const propMap = properties.reduce((acc: any, p) => ({ ...acc, [p.id]: p }), {});

    bookings.forEach((b) => {
      if (!stats[b.customer_id]) {
        stats[b.customer_id] = { staysCount: 0, totalSpent: 0 };
      }
      stats[b.customer_id].staysCount++;
      stats[b.customer_id].totalSpent += b.grand_total || 0;

      const enrichedBooking = {
        ...b,
        property: propMap[b.property_id]
      };

      // Check for currently active in-house stay
      if (
        b.booking_status !== 'Cancelled' &&
        b.booking_status !== 'Checked Out' &&
        b.check_in <= today &&
        b.check_out >= today
      ) {
        stats[b.customer_id].activeStay = enrichedBooking;
      }

      const currentLast = stats[b.customer_id].lastStay;
      if (!currentLast || new Date(b.check_in) > new Date(currentLast.check_in)) {
        stats[b.customer_id].lastStay = enrichedBooking;
      }
    });

    return stats;
  }, [customers, bookings, properties]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.id_number?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    setSavingGuest(true);
    try {
      const g = await repository.createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
        id_type: newIdType,
        id_number: newIdNumber.trim() || undefined,
        city: newCity.trim() || undefined,
        address: newAddress.trim() || undefined,
        notes: newNotes.trim() || undefined
      });
      toast.success('Guest Profile Created', `${g.name} has been added to Bookzee.`);
      setShowAddGuestModal(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewIdNumber('');
      setNewCity('');
      setNewAddress('');
      setNewNotes('');
      await load();
      setSelectedGuest(g);
    } catch (err: any) {
      toast.error('Failed to create guest', err.message);
    } finally {
      setSavingGuest(false);
    }
  }

  async function handleUpdateGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuest || !editName.trim() || !editPhone.trim()) return;

    setUpdatingGuest(true);
    try {
      const updated = await (repository as any).updateCustomer(selectedGuest.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        id_type: editIdType,
        id_number: editIdNumber.trim() || undefined,
        city: editCity.trim() || undefined,
        address: editAddress.trim() || undefined,
        notes: editNotes.trim() || undefined
      });
      setSelectedGuest(updated);
      setIsEditingGuest(false);
      toast.success('Guest Details Updated', `${updated.name}'s profile has been updated.`);
      load();
    } catch (err: any) {
      toast.error('Failed to update guest', err.message);
    } finally {
      setUpdatingGuest(false);
    }
  }

  // Stays for selected guest in profile drawer
  const selectedGuestStays = useMemo(() => {
    if (!selectedGuest) return [];
    const propMap = properties.reduce((acc: any, p) => ({ ...acc, [p.id]: p }), {});
    return bookings
      .filter((b) => b.customer_id === selectedGuest.id)
      .map((b) => ({ ...b, property: propMap[b.property_id] }))
      .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
  }, [selectedGuest, bookings, properties]);

  // Payments for selected guest
  const selectedGuestPayments = useMemo(() => {
    if (!selectedGuest) return [];
    const guestBookingIds = new Set(
      bookings.filter((b) => b.customer_id === selectedGuest.id).map((b) => b.id)
    );
    return payments
      .filter((p) => guestBookingIds.has(p.booking_id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedGuest, bookings, payments]);

  if (loading && customers.length === 0) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="h-96 bg-white rounded-2xl border border-[#D8D2C5]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0D5C56]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0D5C56]">
              Guest Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] mt-1 tracking-tight">
            Guests & Travelers
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-0.5">
            Manage traveler profiles, identification, past stays, and communication history.
          </p>
        </div>

        <button
          onClick={() => setShowAddGuestModal(true)}
          className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Guest</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#D8D2C5]">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C6E6B] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, phone, email, Aadhaar, or city..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[#FAF9F6] border border-[#EAE5DC] rounded-xl outline-none focus:border-[#0D5C56] text-[#1A2B28]"
          />
        </div>

        <div className="text-xs text-[#5C6E6B] font-medium hidden sm:block">
          {filteredCustomers.length} registered guest{filteredCustomers.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Guests Table */}
      <div className="card overflow-hidden bg-white border-[#D8D2C5]">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#5C6E6B]">
            No guests found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EAE5DC] bg-[#FAF9F6] text-xs font-semibold text-[#5C6E6B] uppercase tracking-wider">
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">ID Verification</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-center">Stays</th>
                  <th className="py-3 px-4 text-right">Total Spent</th>
                  <th className="py-3 px-4">Status / Last Stay</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DC]">
                {filteredCustomers.map((c) => {
                  const stats = guestStats[c.id] || { staysCount: 0, totalSpent: 0 };
                  const cleanPhone = c.phone.replace(/[^0-9]/g, '');

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedGuest(c)}
                      className="hover:bg-[#FAF9F6] cursor-pointer transition-colors group text-xs"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name?.[0]?.toUpperCase() || 'G'}
                          </div>
                          <div>
                            <div className="font-semibold text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-[#5C6E6B]">
                              {c.notes ? 'Pref on file' : 'Guest'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#1A2B28] font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{c.phone}</span>
                          <a
                            href={`tel:${c.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Call Guest"
                            className="text-[#0D5C56] hover:text-[#093F3B] p-0.5"
                          >
                            <Phone size={12} />
                          </a>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="WhatsApp Guest"
                            className="text-[#276749] hover:text-[#1c4b35] p-0.5"
                          >
                            <MessageSquare size={12} />
                          </a>
                        </div>
                        {c.email && (
                          <div className="text-[11px] text-[#5C6E6B] truncate max-w-[150px]">
                            {c.email}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {c.id_type ? (
                          <span className="badge bg-[#EBF6EF] text-[#276749] border border-[#BDDFC9]">
                            {c.id_type} Verified
                          </span>
                        ) : (
                          <span className="badge bg-stone-100 text-stone-500 border border-stone-200">
                            Pending ID
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#5C6E6B]">
                        {c.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} /> {c.city}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-[#1A2B28]">
                        {stats.staysCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-[#276749]">
                        {fmtINR(stats.totalSpent)}
                      </td>

                      <td className="py-3.5 px-4 text-[#5C6E6B]">
                        {stats.activeStay ? (
                          <span className="badge bg-[#FAF0EB] text-[#C45532] border border-[#F5DCAD] font-semibold">
                            In-House Now
                          </span>
                        ) : stats.lastStay ? (
                          <div>
                            <div className="font-medium text-[#1A2B28] truncate max-w-[140px]">
                              {stats.lastStay.property?.name}
                            </div>
                            <div className="text-[10px] text-[#5C6E6B]">
                              {fmtDate(stats.lastStay.check_in)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400">No stays</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button className="text-xs font-semibold text-[#0D5C56] group-hover:underline inline-flex items-center gap-1">
                          <span>Profile</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guest Profile Drawer / Modal (Requirements #19 & #20) */}
      {selectedGuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
          onClick={() => setSelectedGuest(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] p-6 space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Avatar & Primary Details */}
            <div className="flex items-start justify-between border-b border-[#EAE5DC] pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center font-bold text-lg shrink-0">
                  {selectedGuest.name?.[0]?.toUpperCase() || 'G'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#1A2B28]">{selectedGuest.name}</h3>
                    {guestStats[selectedGuest.id]?.activeStay && (
                      <span className="badge bg-[#FAF0EB] text-[#C45532] border border-[#F5DCAD]">
                        Currently In-House
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5C6E6B] flex items-center gap-2 mt-0.5">
                    <span>{selectedGuest.phone}</span>
                    {selectedGuest.email && <span>• {selectedGuest.email}</span>}
                    {selectedGuest.city && <span>• {selectedGuest.city}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingGuest(!isEditingGuest)}
                  className="btn btn-outline text-xs py-1.5 px-2.5 flex items-center gap-1.5"
                  title="Edit Guest Details"
                >
                  <Edit3 size={13} />
                  <span>{isEditingGuest ? 'View Details' : 'Edit Details'}</span>
                </button>
                <button
                  onClick={() => setSelectedGuest(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-[#1A2B28] hover:bg-stone-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Action Bar (Requirement 20) */}
            <div className="flex flex-wrap items-center gap-2.5 bg-[#FAF9F6] p-3 rounded-xl border border-[#EAE5DC]">
              <button
                onClick={() => {
                  setSelectedGuest(null);
                  navigate('/bookings/new');
                }}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Create Stay for Guest</span>
              </button>

              <a
                href={`tel:${selectedGuest.phone}`}
                className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Phone size={14} />
                <span>Call Phone</span>
              </a>

              <a
                href={`https://wa.me/${selectedGuest.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-[#276749]"
              >
                <MessageSquare size={14} />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Edit Mode vs View Mode */}
            {isEditingGuest ? (
              <form onSubmit={handleUpdateGuest} className="space-y-4 text-xs bg-[#FAF9F6] p-4 rounded-xl border border-[#EAE5DC]">
                <h4 className="font-bold text-sm text-[#1A2B28] flex items-center gap-2">
                  <Edit3 size={15} className="text-[#0D5C56]" />
                  Edit Guest Profile
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1A2B28] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A2B28] mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A2B28] mb-1">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A2B28] mb-1">City</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A2B28] mb-1">ID Type</label>
                    <select
                      value={editIdType}
                      onChange={(e) => setEditIdType(e.target.value)}
                      className="select text-xs"
                    >
                      <option value="Aadhaar">Aadhaar</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A2B28] mb-1">ID Number</label>
                    <input
                      type="text"
                      value={editIdNumber}
                      onChange={(e) => setEditIdNumber(e.target.value)}
                      placeholder="e.g. 5432-1234-8901"
                      className="input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#1A2B28] mb-1">Full Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Address line"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A2B28] mb-1">
                    Notes & Special Preferences
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Quiet room preferred, vegetarian breakfast, late check-in..."
                    className="input text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingGuest(false)}
                    className="btn btn-outline text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingGuest}
                    className="btn btn-primary text-xs"
                  >
                    {updatingGuest ? 'Saving...' : 'Update Details'}
                  </button>
                </div>
              </form>
            ) : (
              /* Profile Details Cards */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] space-y-1.5">
                  <div className="font-semibold text-[#1A2B28] flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#0D5C56]" />
                    Identification
                  </div>
                  {selectedGuest.id_type ? (
                    <div>
                      <div className="text-[#5C6E6B]">{selectedGuest.id_type}:</div>
                      <div className="font-mono font-bold text-[#1A2B28] mt-0.5">
                        {selectedGuest.id_number || 'On File'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-stone-400">Pending ID document</div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] space-y-1.5">
                  <div className="font-semibold text-[#1A2B28] flex items-center gap-1.5">
                    <CreditCard size={14} className="text-[#276749]" />
                    Spend Metrics
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5C6E6B]">Total Stays:</span>
                    <span className="font-bold text-[#1A2B28]">{selectedGuestStays.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5C6E6B]">Lifetime:</span>
                    <span className="font-bold text-[#276749]">
                      {fmtINR(guestStats[selectedGuest.id]?.totalSpent || 0)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EAE5DC] space-y-1.5">
                  <div className="font-semibold text-[#1A2B28] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#C45532]" />
                    Preferences
                  </div>
                  <div className="text-[#5C6E6B] italic">
                    {selectedGuest.notes || 'No special preferences noted.'}
                  </div>
                </div>
              </div>
            )}

            {/* Stay History Section */}
            <div className="space-y-3 pt-2">
              <h4 className="font-semibold text-sm text-[#1A2B28] flex items-center justify-between">
                <span>Stay Reservations ({selectedGuestStays.length})</span>
                <span className="text-xs font-normal text-[#5C6E6B]">
                  Click to view full reservation
                </span>
              </h4>
              {selectedGuestStays.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400 bg-[#FAF9F6] rounded-xl border border-[#EAE5DC]">
                  No reservations found for this guest.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedGuestStays.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedGuest(null);
                        navigate(`/bookings/${b.id}`);
                      }}
                      className="p-3 rounded-xl border border-[#EAE5DC] hover:border-[#0D5C56] bg-white cursor-pointer transition-all flex items-center justify-between text-xs group"
                    >
                      <div>
                        <div className="font-semibold text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors">
                          {b.property?.name} • <span className="font-mono">{b.booking_no}</span>
                        </div>
                        <div className="text-[#5C6E6B] mt-0.5">
                          {fmtDate(b.check_in)} – {fmtDate(b.check_out)} ({b.nights}n) • {b.room_type}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#1A2B28]">{fmtINR(b.grand_total)}</div>
                        <span
                          className={`badge mt-1 ${
                            b.payment_status === 'Paid'
                              ? 'bg-[#EBF6EF] text-[#276749]'
                              : 'bg-[#FAF0EB] text-[#C45532]'
                          }`}
                        >
                          {b.payment_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment History Section */}
            {selectedGuestPayments.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#EAE5DC]">
                <h4 className="font-semibold text-sm text-[#1A2B28] flex items-center gap-1.5">
                  <Receipt size={15} className="text-[#0D5C56]" />
                  <span>Payment Transactions ({selectedGuestPayments.length})</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedGuestPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border border-[#EAE5DC] bg-[#FAF9F6] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-[#1A2B28]">
                          {p.payment_no} • {p.purpose}
                        </div>
                        <div className="text-[10px] text-[#5C6E6B]">
                          {fmtDate(p.date)} via {p.method} {p.ref_id ? `(${p.ref_id})` : ''}
                        </div>
                      </div>
                      <div className="font-bold text-[#276749]">{fmtINR(p.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE5DC]">
              <button
                onClick={() => setSelectedGuest(null)}
                className="btn btn-outline text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {showAddGuestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
          onClick={() => setShowAddGuestModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-3">
              <h3 className="font-bold text-base text-[#1A2B28]">Register New Guest</h3>
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-[#1A2B28]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGuest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1A2B28] mb-1">
                  Guest Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A2B28] mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A2B28] mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A2B28] mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Delhi, Bangalore, London"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1A2B28] mb-1">ID Type</label>
                  <select
                    value={newIdType}
                    onChange={(e) => setNewIdType(e.target.value)}
                    className="select text-xs"
                  >
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#1A2B28] mb-1">ID Number</label>
                  <input
                    type="text"
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A2B28] mb-1">
                  Notes / Special Preferences
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. High floor, allergic to feathers..."
                  className="input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE5DC]">
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="btn btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGuest}
                  className="btn btn-primary text-xs px-4"
                >
                  {savingGuest ? 'Saving...' : 'Save Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
