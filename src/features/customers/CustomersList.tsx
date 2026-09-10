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
  ArrowRight
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CustomersList() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Customer | null>(null);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);

  // New Guest Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newIdType, setNewIdType] = useState('Aadhaar');
  const [newIdNumber, setNewIdNumber] = useState('');
  const [savingGuest, setSavingGuest] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cList, bList, pList] = await Promise.all([
        repository.getCustomers(),
        repository.getBookings(),
        repository.getProperties()
      ]);
      setCustomers(cList);
      setBookings(bList);
      setProperties(pList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Compute guest stay statistics
  const guestStats = useMemo(() => {
    const stats: Record<
      string,
      { staysCount: number; totalSpent: number; lastStay?: Booking }
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

      const currentLast = stats[b.customer_id].lastStay;
      if (!currentLast || new Date(b.check_in) > new Date(currentLast.check_in)) {
        stats[b.customer_id].lastStay = {
          ...b,
          property: propMap[b.property_id]
        };
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
        c.id_number?.toLowerCase().includes(q)
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
        id_number: newIdNumber.trim() || undefined
      });
      toast.success('Guest Profile Created', `${g.name} added to guest directory.`);
      setShowAddGuestModal(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewIdNumber('');
      load();
    } catch (err: any) {
      toast.error('Failed to create guest', err.message);
    } finally {
      setSavingGuest(false);
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

  if (loading && customers.length === 0) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="h-96 bg-white rounded-2xl border border-[#D4DED9]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
              Guest Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
            Guests & Travelers
          </h1>
          <p className="text-sm text-[#5F716E] mt-0.5">
            Manage traveler records, contact info, ID verification, and stay history.
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
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#D4DED9]">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9B97] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, phone, email, or Aadhaar..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#E8ECE9] rounded-xl outline-none focus:border-[#0F766E] text-[#18312F]"
          />
        </div>

        <div className="text-xs text-[#5F716E] font-medium hidden sm:block">
          {filteredCustomers.length} traveler profile(s)
        </div>
      </div>

      {/* Guests Table */}
      <div className="card overflow-hidden bg-white border-[#D4DED9]">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#5F716E]">
            No guests found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E8ECE9] bg-[#FAF8F5] text-xs font-semibold text-[#5F716E] uppercase tracking-wider">
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">ID Verification</th>
                  <th className="py-3 px-4 text-center">Stays</th>
                  <th className="py-3 px-4 text-right">Total Spent</th>
                  <th className="py-3 px-4">Last Stay</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECE9]">
                {filteredCustomers.map((c) => {
                  const stats = guestStats[c.id] || { staysCount: 0, totalSpent: 0 };

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedGuest(c)}
                      className="hover:bg-[#FAF8F5] cursor-pointer transition-colors group text-xs"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E6F3F1] text-[#0F766E] flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name?.[0]?.toUpperCase() || 'G'}
                          </div>
                          <div>
                            <div className="font-semibold text-[#18312F] group-hover:text-[#0F766E] transition-colors">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-[#8B9B97]">
                              Registered Guest
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#18312F] font-medium whitespace-nowrap">
                        {c.phone}
                      </td>

                      <td className="py-3.5 px-4 text-[#5F716E] max-w-[160px] truncate">
                        {c.email || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {c.id_type ? (
                          <span className="badge bg-[#EAF5EE] text-[#2F7D5A] border border-[#BDE4CD]">
                            {c.id_type} Verified
                          </span>
                        ) : (
                          <span className="badge bg-stone-100 text-stone-500 border border-stone-200">
                            Pending ID
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-[#18312F]">
                        {stats.staysCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-[#2F7D5A]">
                        {fmtINR(stats.totalSpent)}
                      </td>

                      <td className="py-3.5 px-4 text-[#5F716E]">
                        {stats.lastStay ? (
                          <div>
                            <div className="font-medium text-[#18312F] truncate max-w-[140px]">
                              {stats.lastStay.property?.name}
                            </div>
                            <div className="text-[10px] text-[#8B9B97]">
                              {fmtDate(stats.lastStay.check_in)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400">No stays</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button className="text-xs font-semibold text-[#0F766E] group-hover:underline inline-flex items-center gap-1">
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

      {/* Guest Profile Drawer / Modal (Requirement #26) */}
      {selectedGuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
          onClick={() => setSelectedGuest(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#D4DED9] p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#E8ECE9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#E6F3F1] text-[#0F766E] flex items-center justify-center font-bold text-lg">
                  {selectedGuest.name?.[0]?.toUpperCase() || 'G'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#18312F]">{selectedGuest.name}</h3>
                  <div className="text-xs text-[#5F716E] flex items-center gap-2 mt-0.5">
                    <span>{selectedGuest.phone}</span>
                    {selectedGuest.email && <span>• {selectedGuest.email}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuest(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-[#18312F] hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Guest Details Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8ECE9] space-y-2">
                <div className="font-semibold text-[#18312F] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#0F766E]" />
                  Government Identity Verification
                </div>
                {selectedGuest.id_type ? (
                  <div>
                    <div className="text-[#5F716E]">{selectedGuest.id_type} Number:</div>
                    <div className="font-mono font-bold text-[#18312F] mt-0.5">
                      {selectedGuest.id_number || 'Recorded on file'}
                    </div>
                  </div>
                ) : (
                  <div className="text-stone-400">No identity document on file yet.</div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8ECE9] space-y-2">
                <div className="font-semibold text-[#18312F] flex items-center gap-1.5">
                  <CreditCard size={14} className="text-[#2F7D5A]" />
                  Stay & Spend Metrics
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5F716E]">Total Stays Completed:</span>
                  <span className="font-bold text-[#18312F]">{selectedGuestStays.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5F716E]">Lifetime Spend:</span>
                  <span className="font-bold text-[#2F7D5A]">
                    {fmtINR(guestStats[selectedGuest.id]?.totalSpent || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stay History */}
            <div className="space-y-3 pt-2">
              <h4 className="font-semibold text-sm text-[#18312F]">Stay History</h4>
              {selectedGuestStays.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400">
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
                      className="p-3 rounded-xl border border-[#E8ECE9] hover:border-[#0F766E] bg-white cursor-pointer transition-all flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#18312F]">
                          {b.property?.name} • <span className="font-mono">{b.booking_no}</span>
                        </div>
                        <div className="text-[#5F716E] mt-0.5">
                          {fmtDate(b.check_in)} – {fmtDate(b.check_out)} ({b.nights}n) • {b.room_type}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#18312F]">{fmtINR(b.grand_total)}</div>
                        <span
                          className={`badge mt-1 ${
                            b.payment_status === 'Paid'
                              ? 'bg-[#EAF5EE] text-[#2F7D5A]'
                              : 'bg-[#FDF5E8] text-[#B7791F]'
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8ECE9]">
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
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#D4DED9] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8ECE9] pb-3">
              <h3 className="font-bold text-base text-[#18312F]">Register New Guest</h3>
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-[#18312F]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGuest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#18312F] mb-1.5">
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
                <label className="block font-semibold text-[#18312F] mb-1.5">
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
                <label className="block font-semibold text-[#18312F] mb-1.5">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18312F] mb-1.5">ID Type</label>
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
                  <label className="block font-semibold text-[#18312F] mb-1.5">ID Number</label>
                  <input
                    type="text"
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8ECE9]">
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
