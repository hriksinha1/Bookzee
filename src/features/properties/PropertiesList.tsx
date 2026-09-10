import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { repository } from '../../lib/repository';
import { Property, Booking, Payment } from '../../lib/repository/types';
import { AppContextType } from '../../components/layout/AppShell';
import { fmtINR } from '../../lib/utils/formatters';
import {
  Building2,
  MapPin,
  ArrowRight,
  Edit2,
  Power
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
    } catch {
      toast.error('Failed to update property status');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-stone-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 bg-white rounded-xl border border-[#D8D2C5] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header - No Add Property button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A2B28] tracking-tight">
            Properties
          </h1>
          <p className="text-sm text-[#5C6E6B] mt-1">
            Manage your active properties and their operational details.
          </p>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="py-16 text-center text-sm text-[#5C6E6B]">
          No active properties.
        </div>
      ) : (
        /* Property Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => {
            const stats = propertyStats[p.id] || { activeStays: 0, totalBookings: 0, revenue: 0 };
            const isCurrentFilter = propertyFilter === p.id;

            return (
              <div
                key={p.id}
                className={`rounded-xl border bg-white p-5 flex flex-col justify-between transition-all group ${
                  isCurrentFilter
                    ? 'border-[#0D5C56] ring-1 ring-[#0D5C56] shadow-xs'
                    : 'border-[#D8D2C5] hover:border-[#8E9E9B]'
                } ${!p.active ? 'opacity-65' : ''}`}
              >
                <div className="space-y-4">
                  {/* Top identity */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[#5C6E6B] uppercase tracking-wider">
                        {p.property_type || 'Property'}
                      </span>
                      <h2 className="text-lg font-semibold text-[#1A2B28] group-hover:text-[#0D5C56] transition-colors">
                        {p.name}
                      </h2>
                      <div className="flex items-center gap-1.5 text-xs text-[#5C6E6B]">
                        <MapPin size={13} className="text-[#7E8F8C] shrink-0" />
                        <span className="truncate">
                          {p.location ? `${p.location}, ` : ''}{p.city}, {p.state}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
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
                    </div>
                  </div>

                  {/* Operational Summary */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EAE5DC] text-center">
                    <div className="p-2.5 rounded-lg bg-[#FAF9F6]">
                      <div className="text-[11px] text-[#5C6E6B]">Active stays</div>
                      <div className="font-semibold text-base text-[#1A2B28] mt-0.5">
                        {stats.activeStays}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#FAF9F6]">
                      <div className="text-[11px] text-[#5C6E6B]">Bookings</div>
                      <div className="font-semibold text-base text-[#1A2B28] mt-0.5">
                        {stats.totalBookings}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#FAF9F6]">
                      <div className="text-[11px] text-[#5C6E6B]">Revenue</div>
                      <div className="font-semibold text-base text-[#276749] mt-0.5">
                        {fmtINR(stats.revenue)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-[#EAE5DC] mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProperty(p);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#D8D2C5] text-xs font-medium text-[#1A2B28] hover:bg-[#FAF9F6] transition-colors inline-flex items-center gap-1.5"
                  >
                    <Edit2 size={13} className="text-[#5C6E6B]" />
                    <span>Edit property</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPropertyFilter(p.id);
                      toast.success('Workspace Switched', `Filtered workspace to ${p.name}.`);
                      navigate('/bookings');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440] transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Open property</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <PropertyModal
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onComplete={() => {
            setEditingProperty(null);
            load();
          }}
        />
      )}
    </div>
  );
}
