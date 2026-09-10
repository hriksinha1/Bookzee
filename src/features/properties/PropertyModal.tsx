import React, { useState } from 'react';
import { repository } from '../../lib/repository';
import { Property } from '../../lib/repository/types';
import { X, Building2, MapPin, Phone, Mail, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function PropertyModal({
  property,
  onClose,
  onComplete
}: {
  property?: Property | null;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Omit<Property, 'id' | 'created_at'>>({
    name: property?.name || '',
    property_type: property?.property_type || 'Homestay',
    location: property?.location || '',
    address: property?.address || '',
    city: property?.city || '',
    state: property?.state || '',
    pincode: property?.pincode || '',
    phone: property?.phone || '',
    email: property?.email || '',
    gstin: property?.gstin || '',
    check_in_time: property?.check_in_time || '14:00',
    check_out_time: property?.check_out_time || '11:00',
    description: property?.description || '',
    active: property?.active ?? true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (property?.id) {
        await repository.updateProperty(property.id, formData);
        toast.success('Property Updated', `${formData.name} updated successfully.`);
      } else {
        await repository.createProperty(formData);
        toast.success('Property Created', `${formData.name} added to your portfolio.`);
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D8D2C5] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#EAE5DC] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F3F1] text-[#0D5C56] flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A2B28]">
                Edit Property
              </h2>
              <p className="text-xs text-[#5C6E6B]">
                Configure operational property details, house rules, and check-in policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-[#1A2B28] hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Property / Homestay Name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Whispering Pines Heritage Villa"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Property Type <span className="text-rose-500">*</span>
              </label>
              <select
                className="select text-xs"
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
              >
                <option value="Homestay">Homestay</option>
                <option value="Boutique Hotel">Boutique Hotel</option>
                <option value="Heritage Haveli">Heritage Haveli</option>
                <option value="Resort">Resort</option>
                <option value="Luxury Villa">Luxury Villa</option>
                <option value="Eco Cottage">Eco Cottage</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Location / Neighborhood <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-xs"
                placeholder="e.g. Candolim Beachfront, Old City"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Full Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-xs"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Plot / Street / Landmark"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-xs"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Udaipur"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                required
                className="input text-xs"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Rajasthan"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">Pincode</label>
              <input
                className="input text-xs"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g. 313001"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">GSTIN (Optional)</label>
              <input
                className="input text-xs font-mono"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="e.g. 08AABCT1332M1ZP"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">Contact Phone</label>
              <input
                className="input text-xs"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98290 11223"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">Contact Email</label>
              <input
                className="input text-xs"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="stay@property.com"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Standard Check-in Time
              </label>
              <input
                type="time"
                className="input text-xs"
                value={formData.check_in_time}
                onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Standard Check-out Time
              </label>
              <input
                type="time"
                className="input text-xs"
                value={formData.check_out_time}
                onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#1A2B28] mb-1.5">
                Description / House Rules (Optional)
              </label>
              <textarea
                rows={2}
                className="input text-xs"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Quiet hours after 10 PM. No smoking inside heritage rooms."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EAE5DC]">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary text-xs px-5"
            >
              {loading ? 'Saving Property...' : property ? 'Update Property' : 'Save Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
