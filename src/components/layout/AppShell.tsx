import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Building2,
  CreditCard,
  AlertCircle,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Plus,
  Menu,
  X,
  ChevronDown,
  Compass,
  CheckCircle,
  SlidersHorizontal,
  Home
} from 'lucide-react';
import { repository } from '../../lib/repository';
import { Property } from '../../lib/repository/types';
import GlobalSearchModal from '../navigation/GlobalSearchModal';

export type AppContextType = {
  propertyFilter: string;
  setPropertyFilter: (id: string) => void;
  properties: Property[];
};

export default function AppShell({ onLogout }: { onLogout: () => void }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    repository.getProperties().then((res) => {
      setProperties(res.filter((p) => p.active));
    });
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const activeProperty = properties.find((p) => p.id === propertyFilter);

  const navLinks = [
    {
      section: 'TODAY',
      items: [
        { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/calendar', label: 'Calendar', icon: Calendar },
      ],
    },
    {
      section: 'STAYS',
      items: [
        { to: '/bookings', label: 'Bookings', icon: CalendarDays },
        { to: '/guests', label: 'Guests', icon: Users },
      ],
    },
    {
      section: 'MONEY',
      items: [
        { to: '/payments', label: 'Payments', icon: CreditCard },
        { to: '/outstanding', label: 'Outstanding', icon: AlertCircle },
      ],
    },
    {
      section: 'BUSINESS',
      items: [
        { to: '/properties', label: 'Properties', icon: Building2 },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-[#F8F7F4] overflow-hidden font-sans text-[#1A2B28]">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Desktop Sidebar Rail */}
      <aside className="w-68 bg-white border-r border-[#D8D2C5] flex-col z-30 hidden lg:flex select-none">
        {/* Brand Area */}
        <div className="h-18 flex items-center px-6 border-b border-[#EAE5DC] justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D5C56] to-[#073330] text-white flex items-center justify-center shadow-xs group-hover:scale-[1.02] transition-transform">
              {/* Refined Bookzee Hospitality Arch/Key Motif */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z"/>
                <path d="M9 21v-7a3 3 0 0 1 6 0v7"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-lg tracking-tight text-[#1A2B28] flex items-center gap-1.5">
                Bookzee
              </div>
              <div className="text-xs text-[#5C6E6B]">Operations Workspace</div>
            </div>
          </NavLink>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 border-b border-[#EAE5DC]">
          <button
            onClick={() => navigate('/bookings/new')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0D5C56] text-white font-medium hover:bg-[#094440] transition-all shadow-xs active:scale-[0.99] text-sm"
          >
            <Plus size={18} strokeWidth={2.2} />
            <span>New Booking</span>
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navLinks.map((group) => (
            <div key={group.section} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
                {group.section}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#E8F3F1] text-[#0D5C56] shadow-xs font-semibold'
                          : 'text-[#5C6E6B] hover:bg-[#FAF9F6] hover:text-[#1A2B28]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          className={isActive ? 'text-[#0D5C56]' : 'text-[#5C6E6B]'}
                        />
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* System Section */}
          <div className="space-y-1 pt-2 border-t border-[#EAE5DC]">
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
              SYSTEM
            </div>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#E8F3F1] text-[#0D5C56] shadow-xs font-semibold'
                    : 'text-[#5C6E6B] hover:bg-[#FAF9F6] hover:text-[#1A2B28]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <SettingsIcon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={isActive ? 'text-[#0D5C56]' : 'text-[#5C6E6B]'}
                  />
                  <span>Settings</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>

        {/* User Session Footer */}
        <div className="p-4 border-t border-[#EAE5DC] bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#E8F3F1] text-[#0D5C56] font-semibold text-xs flex items-center justify-center border border-[#D8D2C5]">
                BZ
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1A2B28] truncate">Bookzee Stays</p>
                <p className="text-[11px] text-[#5C6E6B] truncate">Host Operations</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#5C6E6B] hover:text-[#C45532] hover:bg-white transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-18 bg-white border-b border-[#D8D2C5] flex items-center justify-between px-4 sm:px-8 z-20 shrink-0">
          <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#1A2B28] hover:bg-[#FAF9F6] transition-colors"
              aria-label="Open navigation drawer"
            >
              <Menu size={22} />
            </button>

            {/* Mobile Brand Logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-[#0D5C56] text-white flex items-center justify-center font-bold text-xs">
                B
              </div>
              <span className="font-semibold text-sm text-[#1A2B28] hidden sm:inline">Bookzee</span>
            </div>

            {/* Prominent Property Scope Selector */}
            <div className="relative flex items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] text-xs sm:text-sm font-medium text-[#1A2B28] hover:border-[#0D5C56] transition-colors">
                <Building2 size={16} className="text-[#0D5C56] shrink-0" />
                <select
                  aria-label="Filter workspace by property"
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#1A2B28] font-medium cursor-pointer pr-5 appearance-none max-w-[140px] sm:max-w-[220px] truncate"
                >
                  <option value="">All Properties ({properties.length})</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-[#5C6E6B] -ml-4 pointer-events-none" />
              </div>
              {propertyFilter && (
                <span className="ml-2 hidden xl:inline-flex items-center gap-1 text-xs text-[#0D5C56] bg-[#E8F3F1] px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle size={12} /> Filtered to {activeProperty?.name}
                </span>
              )}
            </div>

            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-[#D8D2C5] bg-[#FAF9F6] text-[#5C6E6B] hover:text-[#1A2B28] hover:border-[#0D5C56] transition-colors text-xs sm:text-sm max-w-xs flex-1 sm:flex-initial"
            >
              <Search size={16} className="text-[#5C6E6B]" />
              <span className="hidden md:inline">Search bookings, guests, receipts...</span>
              <span className="md:hidden">Search...</span>
              <kbd className="hidden sm:inline-block ml-auto text-[10px] px-1.5 py-0.5 bg-white border border-stone-200 rounded text-stone-500 font-mono shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Quick Link to New Booking on tablet/mobile */}
            <button
              onClick={() => navigate('/bookings/new')}
              className="lg:hidden flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#0D5C56] text-white text-xs font-medium hover:bg-[#094440]"
              title="New Booking"
            >
              <Plus size={18} />
              <span className="hidden sm:inline ml-1">New Stay</span>
            </button>

            {/* Property count badge */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#EAE5DC]">
              <span className="w-2 h-2 rounded-full bg-[#276749]"></span>
              <span className="text-xs font-medium text-[#5C6E6B]">
                {propertyFilter ? activeProperty?.name : 'Portfolio View'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <Outlet context={{ propertyFilter, setPropertyFilter, properties }} />
        </main>

        {/* Mobile Bottom Navigation Rail */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#D8D2C5] flex items-center justify-around px-2 z-30 shadow-lg">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#0D5C56] font-semibold' : 'text-[#5C6E6B]'
              }`
            }
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#0D5C56] font-semibold' : 'text-[#5C6E6B]'
              }`
            }
          >
            <Calendar size={20} />
            <span>Calendar</span>
          </NavLink>
          <NavLink
            to="/bookings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#0D5C56] font-semibold' : 'text-[#5C6E6B]'
              }`
            }
          >
            <CalendarDays size={20} />
            <span>Bookings</span>
          </NavLink>
          <NavLink
            to="/payments"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#0D5C56] font-semibold' : 'text-[#5C6E6B]'
              }`
            }
          >
            <CreditCard size={20} />
            <span>Payments</span>
          </NavLink>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-14 py-1 text-[11px] font-medium text-[#5C6E6B] hover:text-[#1A2B28]"
          >
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#EAE5DC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0D5C56] text-white flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div className="font-semibold text-base text-[#1A2B28]">Bookzee</div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#5C6E6B] hover:text-[#1A2B28]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Nav Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/bookings/new');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0D5C56] text-white font-medium text-sm"
              >
                <Plus size={18} />
                <span>New Booking</span>
              </button>

              {navLinks.map((group) => (
                <div key={group.section} className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B]">
                    {group.section}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                            isActive
                              ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold'
                              : 'text-[#5C6E6B] hover:bg-[#FAF9F6] hover:text-[#1A2B28]'
                          }`
                        }
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ))}

              <div className="pt-2 border-t border-[#EAE5DC]">
                <NavLink
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      isActive
                        ? 'bg-[#E8F3F1] text-[#0D5C56] font-semibold'
                        : 'text-[#5C6E6B] hover:bg-[#FAF9F6]'
                    }`
                  }
                >
                  <SettingsIcon size={18} />
                  <span>Settings</span>
                </NavLink>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#EAE5DC] bg-[#FAF9F6]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#C45532] hover:bg-rose-50 transition-colors"
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
