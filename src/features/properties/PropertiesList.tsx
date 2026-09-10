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
  Edit2
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
        repository.getAllPayments()
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
        'Property Updated',
        `${p.name} is now ${!p.active ? 'Active' : 'Inactive'}.`
      );
      load();
    } catch (err) {
      toast.error('Could not update property');
    }
  }

  if (loading && properties.length === 0) {
    return (
      <div className="animate-pulse space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-[#D4DED9]"></div>
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
            <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
              Portfolio Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
            Properties & Homestays
          </h1>
          <p className="text-sm text-[#5F716E] mt-0.5">
            Manage your boutique stays, heritage estates, check-in policies, and rooms.
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

      {/* Property Cards Grid (Requirement #25) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((p) => {
          const stats = propertyStats[p.id] || { activeStays: 0, totalBookings: 0, revenue: 0 };
          const isCurrentFilter = propertyFilter === p.id;

          return (
            <div
              key={p.id}
              className={`card p-6 bg-white flex flex-col justify-between transition-all group ${
                isCurrentFilter
                  ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20 shadow-md'
                  : 'border-[#D4DED9] hover:border-[#8B9B97]'
              } ${!p.active ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="space-y-4">
                {/* Top Badge & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E6F3F1] text-[#0F766E] flex items-center justify-center font-bold">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F3F1] px-2 py-0.5 rounded-md">
                        {p.property_type || 'Homestay'}
                      </span>
                      <h3 className="font-bold text-base text-[#18312F] mt-1 group-hover:text-[#0F766E] transition-colors">
                        {p.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingProperty(p);
                      setShowModal(true);
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-[#18312F] hover:bg-[#FAF8F5] transition-colors"
                    title="Edit Property"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>

                {/* Location & Details */}
                <div className="text-xs text-[#5F716E] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#18312F]">
                    <MapPin size={13} className="text-[#C65D3A] shrink-0" />
                    <span className="truncate">
                      {p.location ? `${p.location}, ` : ''}
                      {p.city}, {p.state}
                    </span>
                  </div>
                  {p.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-[#8B9B97] shrink-0" />
                      <span>{p.phone}</span>
                    </div>
                  )}
                  {p.gstin && (
                    <div className="text-[11px] text-[#8B9B97] font-mono">
                      GSTIN: {p.gstin}
                    </div>
                  )}
                </div>

                {/* Key Operational Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E8ECE9] text-center">
                  <div className="p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="text-[10px] text-[#5F716E]">Active Stays</div>
                    <div className="font-bold text-sm text-[#18312F] mt-0.5">
                      {stats.activeStays}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="text-[10px] text-[#5F716E]">All Bookings</div>
                    <div className="font-bold text-sm text-[#18312F] mt-0.5">
                      {stats.totalBookings}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF8F5]">
                    <div className="text-[10px] text-[#5F716E]">Revenue</div>
                    <div className="font-bold text-sm text-[#2F7D5A] mt-0.5">
                      {fmtINR(stats.revenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-[#E8ECE9] mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setPropertyFilter(p.id);
                    toast.success('Workspace Switched', `Filtered workspace to ${p.name}.`);
                    navigate('/bookings');
                  }}
                  className={`btn text-xs flex-1 flex items-center justify-center gap-1.5 ${
                    isCurrentFilter
                      ? 'bg-[#E6F3F1] text-[#0F766E] border border-[#BDE4CD] font-semibold'
                      : 'btn-outline bg-white'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  <span>{isCurrentFilter ? 'Active Workspace' : 'Switch Workspace'}</span>
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
