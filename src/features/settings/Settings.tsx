import React, { useEffect, useState } from 'react';
import { repository } from '../../lib/repository';
import { BusinessSettings } from '../../lib/repository/types';
import {
  RotateCcw,
  Building2,
  Receipt,
  Clock,
  ShieldAlert,
  Save,
  CheckCircle2,
  Sparkles,
  FileText
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await repository.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await repository.updateSettings(settings);
      toast.success('Settings Saved', 'Business profile and operational policies updated.');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (
      confirm(
        'WARNING: This will wipe all current bookings, payments, and custom properties, and restore the initial seed state. Continue?'
      )
    ) {
      await repository.resetDemoData();
      toast.success('Demo Database Reset', 'Demo database restored to initial sample stays.');
      setTimeout(() => {
        window.location.reload();
      }, 700);
    }
  }

  if (loading || !settings) {
    return (
      <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
        <div className="h-10 w-64 bg-stone-200 rounded-xl"></div>
        <div className="h-96 bg-white rounded-2xl border border-[#D4DED9]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">
              Configuration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18312F] mt-1 tracking-tight">
            Settings & Policies
          </h1>
          <p className="text-sm text-[#5F716E] mt-0.5">
            Manage your hospitality brand profile, invoice numbering, policies, and demo sandbox.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary text-xs sm:text-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Business Profile (Requirement #28) */}
        <div className="card p-6 bg-white border-[#D4DED9] space-y-5">
          <div className="flex items-center gap-3 border-b border-[#E8ECE9] pb-4">
            <div className="w-9 h-9 rounded-xl bg-[#E6F3F1] text-[#0F766E] flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#18312F]">Business Profile</h3>
              <p className="text-xs text-[#5F716E]">
                Hospitality brand name, GSTIN, and legal contact information
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">Brand Name</label>
              <input
                className="input text-xs"
                value={settings.name || ''}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                placeholder="Serene Hospitality Group"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">Legal Entity Name</label>
              <input
                className="input text-xs"
                value={settings.legalName || ''}
                onChange={(e) => setSettings({ ...settings, legalName: e.target.value })}
                placeholder="Serene Hospitality & Stays Pvt. Ltd."
              />
            </div>

            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">GSTIN Number</label>
              <input
                className="input text-xs font-mono"
                value={settings.gstin || ''}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                placeholder="29ABCDE1234F1Z5"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">Support Phone</label>
              <input
                className="input text-xs"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="+91 80 2345 6789"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">Primary Email</label>
              <input
                type="email"
                className="input text-xs"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="operations@serenestays.in"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Registered Address
              </label>
              <input
                className="input text-xs"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Suite 401, Heritage Towers, MG Road, Bengaluru, Karnataka 560001"
              />
            </div>
          </div>
        </div>

        {/* 2. Invoice & Receipt Settings */}
        <div className="card p-6 bg-white border-[#D4DED9] space-y-5">
          <div className="flex items-center gap-3 border-b border-[#E8ECE9] pb-4">
            <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] text-[#18312F] flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#18312F]">Invoice & Billing Settings</h3>
              <p className="text-xs text-[#5F716E]">
                Prefix codes for generated guest folio vouchers and tax defaults
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Invoice Prefix
              </label>
              <input
                className="input text-xs font-mono"
                value={settings.invoicePrefix || 'INV-'}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                placeholder="INV-"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Receipt Prefix
              </label>
              <input
                className="input text-xs font-mono"
                value={settings.receiptPrefix || 'PAY-'}
                onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                placeholder="PAY-"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Default GST Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="28"
                className="input text-xs"
                value={settings.defaultTaxRate ?? 12}
                onChange={(e) =>
                  setSettings({ ...settings, defaultTaxRate: Number(e.target.value) || 0 })
                }
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Stay Folio Terms & Conditions
              </label>
              <textarea
                rows={2}
                className="input text-xs"
                value={settings.termsConditions || ''}
                onChange={(e) => setSettings({ ...settings, termsConditions: e.target.value })}
                placeholder="Government photo ID required at check-in. Non-smoking suites. Pets permitted upon prior notice."
              />
            </div>
          </div>
        </div>

        {/* 3. Hotel Policies */}
        <div className="card p-6 bg-white border-[#D4DED9] space-y-5">
          <div className="flex items-center gap-3 border-b border-[#E8ECE9] pb-4">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5EE] text-[#2F7D5A] flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#18312F]">Stay & Check-in Policies</h3>
              <p className="text-xs text-[#5F716E]">
                Operational check-in / check-out defaults and cancellation rules
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Default Check-in Time
              </label>
              <input
                type="time"
                className="input text-xs"
                value={settings.checkInTime || '14:00'}
                onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Default Check-out Time
              </label>
              <input
                type="time"
                className="input text-xs"
                value={settings.checkOutTime || '11:00'}
                onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#18312F] mb-1.5">
                Cancellation Policy Text
              </label>
              <textarea
                rows={2}
                className="input text-xs"
                value={settings.cancellationPolicy || ''}
                onChange={(e) => setSettings({ ...settings, cancellationPolicy: e.target.value })}
                placeholder="Free cancellation up to 48 hours before check-in date. Late cancellations incur a 1-night tariff retention."
              />
            </div>
          </div>
        </div>

        {/* 4. Demo Data Controls */}
        <div className="card p-6 bg-[#FDF0F0] border-[#F7C5C5] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#B84A4A] flex items-center justify-center shadow-xs">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#B84A4A]">Demo Workspace Controls</h3>
              <p className="text-xs text-[#7A3333]">
                Manage sample homestay reservations, guest records, and transactions
              </p>
            </div>
          </div>

          <p className="text-xs text-[#7A3333] leading-relaxed">
            Resetting the demo data will wipe any newly created stays or payments recorded during
            this browser session and restore the rich initial portfolio (The Heritage Courtyard,
            Valley View Resort, Whispering Pines Villa, etc.) with ready-to-test arrivals and departures.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="btn text-xs bg-white text-[#B84A4A] border border-[#F7C5C5] hover:bg-[#FBEFEA] flex items-center gap-2"
            >
              <RotateCcw size={14} />
              <span>Reset Demo Database to Initial State</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
