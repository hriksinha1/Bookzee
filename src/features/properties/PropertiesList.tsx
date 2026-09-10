import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Property, Booking, Payment } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtINR } from '../../lib/utils/formatters';
import {
  Plus,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  BedDouble,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Edit2,
  Power,
  Clock
} from 'lucide-react';
import PropertyModal from './PropertyModal';
import { useToast } from '../../context/ToastContext';

export default function PropertiesList() {
  const { propertyFilter, setPropertyFilter } = useOutletContext<AppContextType>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [pList, bList, payList] = await Promise.all([
        repository.getProperties(),
        repository.getBookings(),
        repository.getPayments()
      ]);
      setProperties(pList);
      setBookings(bList);
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

  // Compute operational stats per property
  const propertyStats = useMemo(() => {
    const stats: Record<
      string,
      { activeStays: number; totalBookings: number; revenue: number }
    > = {};

    properties.forEach((p) => {
      stats[p.id] = { activeStays: 0, totalBookings: 0, revenue: 0 };
    });

    const todayStr = new Date().toISOString().split('T')[0];

    bookings.forEach((b) => {
      if (!stats[b.property_id]) return;
      stats[b.property_id].totalBookings++;
      if (
        b.booking_status === 'Checked In' ||
        (b.check_in <= todayStr && b.check_out > todayStr && b.booking_status !== 'Cancelled')
      ) {
        stats[b.property_id].activeStays++;
      }
    });

    payments.forEach((pay) => {
      const b = bookings.find((bk) => bk.id === pay.booking_id);
      if (b && stats[b.property_id] && (pay.status === 'Recorded' || pay.status === 'Completed')) {
        stats[b.property_id].revenue += pay.amount;
      }
    });

    return stats;
  }, [properties, bookings, payments]);

  async function handleToggleStatus(e: React.MouseEvent, p: Property) {
    e.stopPropagation();
    try {
      await repository.updateProperty(p.id, { active: !p.active });
      toast.success(
        'Property Status Updated',
        `${p.name} is now ${!p.active ? 'Active' : 'Inactive'}.`
      );
      load();
    } catch (err) {
      toast.error('Could not update property status');
    }
  }

  if (loading && properties.length === 0) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-[#D8D2C5]"></div>
          ))}
        </div>
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
              Portfolio Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] mt-1 tracking-tight">
            Properties & Homestays
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-0.5">
            Manage your boutique stays, heritage estates, check-in policies, and operational capacity.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProperty(null);
            setShowModal(true);
          }}
          className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Property</span>
        </button>
      </div>

      {/* Property Cards Grid (Requirements 15, 16, 17) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((p) => {
          const stats = propertyStats[p.id] || { activeStays: 0, totalBookings: 0, revenue: 0 };
          const isCurrentFilter = propertyFilter === p.id;

          return (
            <div
              key={p.id}
              className={`card p-6 bg-white flex flex-col justify-between transition-all group ${
                isCurrentFilter
                  ? 'border-[#0D5C56] ring-2 ring-[#0D5C56]/20 shadow-md'
                  : 'border-[#D8D2C5] hover:border-[#8E9E9B]'
              } ${!p.active ? 'opacity-65' : ''}`}
            >
              <div className="space-y-4">
                {/* Top Badge & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center font-bold shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D5C56] bg-[#E8F3F1] px-2 py-0.5 rounded-md">
                          {p.property_type || 'Homestay'}
                        </span>
                        {!p.active && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                            Inactive
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-[#1A2B28] mt-1 group-hover:text-[#0D5C56] transition-colors">
                        {p.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleStatus(e, p)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        p.active
                          ? 'text-[#276749] hover:bg-[#EBF6EF]'
                          : 'text-stone-400 hover:bg-stone-100'
                      }`}
                      title={p.active ? 'Active Property (Click to deactivate)' : 'Inactive (Click to activate)'}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingProperty(p);
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#1A2B28] hover:bg-[#FAF9F6] transition-colors"
                      title="Edit Property"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Location & Details */}
                <div className="text-xs text-[#5C6E6B] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#1A2B28]">
                    <MapPin size={13} className="text-[#C45532] shrink-0" />
                    <span className="truncate">
                      {p.location ? `${p.location}, ` : ''}
                      {p.city}, {p.state}
                    </span>
                  </div>
                  {p.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-[#5C6E6B] shrink-0" />
                      <span>{p.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-[#5C6E6B]">
                    <Clock size={12} className="shrink-0" />
                    <span>In: {p.check_in_time || '14:00'} • Out: {p.check_out_time || '11:00'}</span>
                  </div>
                  {p.gstin && (
                    <div className="text-[11px] text-[#5C6E6B] font-mono">
                      GSTIN: {p.gstin}
                    </div>
                  )}
                </div>

                {/* Key Operational Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EAE5DC] text-center">
                  <div className="p-2 rounded-xl bg-[#FAF9F6]">
                    <div className="text-[10px] text-[#5C6E6B]">Active Stays</div>
                    <div className="font-bold text-sm text-[#1A2B28] mt-0.5">
                      {stats.activeStays}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF9F6]">
                    <div className="text-[10px] text-[#5C6E6B]">All Bookings</div>
                    <div className="font-bold text-sm text-[#1A2B28] mt-0.5">
                      {stats.totalBookings}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF9F6]">
                    <div className="text-[10px] text-[#5C6E6B]">Revenue</div>
                    <div className="font-bold text-sm text-[#276749] mt-0.5">
                      {fmtINR(stats.revenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-[#EAE5DC] mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setPropertyFilter(p.id);
                    toast.success('Workspace Switched', `Filtered workspace to ${p.name}.`);
                    navigate('/bookings');
                  }}
                  className={`btn text-xs flex-1 flex items-center justify-center gap-1.5 ${
                    isCurrentFilter
                      ? 'bg-[#E8F3F1] text-[#0D5C56] border border-[#BDDFC9] font-semibold'
                      : 'btn-outline bg-white'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  <span>{isCurrentFilter ? 'Active Workspace' : 'Select Workspace'}</span>
                </button>

                <button
                  onClick={() => {
                    setPropertyFilter(p.id);
                    navigate('/bookings/new');
                  }}
                  className="btn btn-outline text-xs p-2.5 hover:bg-[#FAF9F6]"
                  title="Create new stay for this property"
                >
                  <Plus size={14} />
                </button>

                <button
                  onClick={() => {
                    setPropertyFilter(p.id);
                    navigate('/bookings');
                  }}
                  className="btn btn-primary text-xs p-2.5"
                  title="View Bookings for this property"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Property Modal */}
      {showModal && (
        <PropertyModal
          property={editingProperty}
          onClose={() => {
            setShowModal(false);
            setEditingProperty(null);
          }}
          onComplete={() => {
            setShowModal(false);
            setEditingProperty(null);
            load();
          }}
        />
      )}
    </div>
  );
}
