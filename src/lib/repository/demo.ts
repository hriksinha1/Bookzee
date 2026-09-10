import { IRepository, Property, Customer, Booking, Payment, Notification, BusinessSettings } from './types';
import { generateId } from '../utils/formatters';

const STORAGE_KEY = 'mytrackyo_demo_db_v2';

interface DemoDB {
  properties: Property[];
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  notifications: Notification[];
  settings: BusinessSettings;
}

// Helper to format date offset from today
function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getInitialData(): DemoDB {
  const nowIso = new Date().toISOString();

  const properties: Property[] = [
    {
      id: 'p1',
      name: 'The Heritage Courtyard',
      property_type: 'Boutique Hotel',
      location: 'City Center',
      address: '12 Temple Road',
      city: 'Mysuru',
      state: 'Karnataka',
      pincode: '570001',
      phone: '+91 98765 43210',
      email: 'heritage@mytrackyo.local',
      gstin: '29ABCDE1234F1Z5',
      check_in_time: '14:00',
      check_out_time: '11:00',
      description: 'Restored 19th-century royal courtyard with 16 bespoke heritage suites.',
      active: true,
      created_at: nowIso
    },
    {
      id: 'p2',
      name: 'Valley View Resort',
      property_type: 'Resort & Spa',
      location: 'Hill Station',
      address: 'Mist Point, Tea Gardens',
      city: 'Munnar',
      state: 'Kerala',
      pincode: '685612',
      phone: '+91 98765 43211',
      email: 'valley@mytrackyo.local',
      gstin: '32ABCDE1234F1Z5',
      check_in_time: '13:00',
      check_out_time: '11:00',
      description: 'Panoramic tea plantation sanctuary featuring luxury cloud-facing chalets.',
      active: true,
      created_at: nowIso
    },
    {
      id: 'p3',
      name: 'Coral Beach Homestay',
      property_type: 'Homestay',
      location: 'North Goa',
      address: 'Beach Lane, Near Flea Market',
      city: 'Anjuna',
      state: 'Goa',
      pincode: '403509',
      phone: '+91 98765 43212',
      email: 'coral@mytrackyo.local',
      check_in_time: '14:00',
      check_out_time: '11:00',
      description: 'Charming Portuguese heritage villa 150m from the Arabian Sea.',
      active: true,
      created_at: nowIso
    },
    {
      id: 'p4',
      name: 'Pinecrest Cabin',
      property_type: 'Homestay',
      location: 'Old Manali',
      address: 'Upper Orchard Road',
      city: 'Manali',
      state: 'Himachal Pradesh',
      pincode: '175131',
      phone: '+91 98765 43213',
      email: 'pine@mytrackyo.local',
      check_in_time: '12:00',
      check_out_time: '11:00',
      description: 'Handcrafted cedarwood cabin framed by apple orchards and snow-capped peaks.',
      active: true,
      created_at: nowIso
    },
    {
      id: 'p5',
      name: 'Oasis Business Hotel',
      property_type: 'Business Hotel',
      location: 'Outer Ring Road',
      address: 'Tech Corridor',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560037',
      phone: '+91 98765 43214',
      email: 'oasis@mytrackyo.local',
      gstin: '29ABCDE1234F1Z5',
      check_in_time: '14:00',
      check_out_time: '12:00',
      description: 'High-connectivity business rooms with 24/7 dining and conference studios.',
      active: true,
      created_at: nowIso
    }
  ];

  const customers: Customer[] = [
    { id: 'c1', name: 'Rahul Sharma', phone: '+91 91234 56701', email: 'rahul.sharma@example.com', created_at: nowIso },
    { id: 'c2', name: 'Priya Patel', phone: '+91 91234 56702', email: 'priya.patel@example.com', created_at: nowIso },
    { id: 'c3', name: 'Ananya Desai', phone: '+91 91234 56703', email: 'ananya.desai@example.com', created_at: nowIso },
    { id: 'c4', name: 'Vikram Singh', phone: '+91 91234 56704', email: 'vikram.singh@example.com', created_at: nowIso },
    { id: 'c5', name: 'Neha Gupta', phone: '+91 91234 56705', email: 'neha.gupta@example.com', created_at: nowIso },
    { id: 'c6', name: 'Karthik Reddy', phone: '+91 91234 56706', email: 'karthik.reddy@example.com', created_at: nowIso },
    { id: 'c7', name: 'Sonal Iyer', phone: '+91 91234 56707', email: 'sonal.iyer@example.com', created_at: nowIso },
    { id: 'c8', name: 'Arjun Nair', phone: '+91 91234 56708', email: 'arjun.nair@example.com', created_at: nowIso },
    { id: 'c9', name: 'Meera Rao', phone: '+91 91234 56709', email: 'meera.rao@example.com', created_at: nowIso },
    { id: 'c10', name: 'Rohan Mehta', phone: '+91 91234 56710', email: 'rohan.mehta@example.com', created_at: nowIso },
    { id: 'c11', name: 'Kabir Malhotra', phone: '+91 91234 56711', email: 'kabir.m@example.com', created_at: nowIso },
    { id: 'c12', name: 'Aditi Sen', phone: '+91 91234 56712', email: 'aditi.sen@example.com', created_at: nowIso }
  ];

  const bookings: Booking[] = [
    // Today's Arrival 1 (Valley View) - Partially Paid
    {
      id: 'b-arr-1',
      booking_no: 'BK-1011',
      customer_id: 'c1',
      property_id: 'p2',
      check_in: getDateOffset(0),
      check_out: getDateOffset(2),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Valley Deluxe Chalet',
      base_amount: 18000,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 2160,
      grand_total: 20160,
      booking_status: 'Confirmed',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-5)
    },
    // Today's Arrival 2 (The Heritage Courtyard) - Fully Paid
    {
      id: 'b-arr-2',
      booking_no: 'BK-1012',
      customer_id: 'c2',
      property_id: 'p1',
      check_in: getDateOffset(0),
      check_out: getDateOffset(3),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Maharaja Royal Suite',
      base_amount: 24000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 4320,
      grand_total: 28320,
      booking_status: 'Confirmed',
      payment_status: 'Paid',
      created_at: getDateOffset(-8)
    },
    // Today's Arrival 3 (Coral Beach) - Unpaid
    {
      id: 'b-arr-3',
      booking_no: 'BK-1013',
      customer_id: 'c5',
      property_id: 'p3',
      check_in: getDateOffset(0),
      check_out: getDateOffset(2),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Sea Breeze Suite',
      base_amount: 9000,
      tax_enabled: false,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: 9000,
      booking_status: 'Confirmed',
      payment_status: 'Unpaid',
      created_at: getDateOffset(-3)
    },

    // Today's Departure 1 (Valley View) - Fully Paid via 2 payments
    {
      id: 'b-dep-1',
      booking_no: 'BK-1008',
      customer_id: 'c8',
      property_id: 'p2',
      check_in: getDateOffset(-3),
      check_out: getDateOffset(0),
      nights: 3,
      rooms: 2,
      guests: 4,
      room_type: 'Plantation Suite',
      base_amount: 36000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 6480,
      grand_total: 42480,
      booking_status: 'Checked In',
      payment_status: 'Paid',
      created_at: getDateOffset(-10)
    },
    // Today's Departure 2 (Pinecrest Cabin) - Balance Due!
    {
      id: 'b-dep-2',
      booking_no: 'BK-1009',
      customer_id: 'c7',
      property_id: 'p4',
      check_in: getDateOffset(-2),
      check_out: getDateOffset(0),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Cedar Chalet',
      base_amount: 14000,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 1680,
      grand_total: 15680,
      booking_status: 'Checked In',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-7)
    },

    // In-House Stays
    {
      id: 'b-stay-1',
      booking_no: 'BK-1010',
      customer_id: 'c10',
      property_id: 'p1',
      check_in: getDateOffset(-1),
      check_out: getDateOffset(2),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Courtyard Deluxe',
      base_amount: 16000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 2880,
      grand_total: 18880,
      booking_status: 'Checked In',
      payment_status: 'Paid',
      created_at: getDateOffset(-4)
    },
    {
      id: 'b-stay-2',
      booking_no: 'BK-1007',
      customer_id: 'c11',
      property_id: 'p5',
      check_in: getDateOffset(-2),
      check_out: getDateOffset(1),
      nights: 3,
      rooms: 1,
      guests: 1,
      room_type: 'Executive Club',
      base_amount: 12000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 2160,
      grand_total: 14160,
      booking_status: 'Checked In',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-6)
    },

    // Upcoming Bookings
    {
      id: 'b-up-1',
      booking_no: 'BK-1014',
      customer_id: 'c12',
      property_id: 'p3',
      check_in: getDateOffset(2),
      check_out: getDateOffset(5),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Palm Cottage',
      base_amount: 15000,
      tax_enabled: false,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: 15000,
      booking_status: 'Confirmed',
      payment_status: 'Unpaid',
      created_at: getDateOffset(-2)
    },
    {
      id: 'b-up-2',
      booking_no: 'BK-1015',
      customer_id: 'c4',
      property_id: 'p4',
      check_in: getDateOffset(4),
      check_out: getDateOffset(7),
      nights: 3,
      rooms: 1,
      guests: 3,
      room_type: 'Alpine Loft',
      base_amount: 21000,
      tax_enabled: true,
      tax_rate: 12,
      tax_amount: 2520,
      grand_total: 23520,
      booking_status: 'Confirmed',
      payment_status: 'Partially Paid',
      created_at: getDateOffset(-1)
    },
    {
      id: 'b-up-3',
      booking_no: 'BK-1016',
      customer_id: 'c3',
      property_id: 'p2',
      check_in: getDateOffset(6),
      check_out: getDateOffset(8),
      nights: 2,
      rooms: 1,
      guests: 2,
      room_type: 'Tea Glamping Pod',
      base_amount: 18000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 3240,
      grand_total: 21240,
      booking_status: 'Confirmed',
      payment_status: 'Paid',
      created_at: getDateOffset(0)
    },

    // Completed Stays (Historical data for reporting and analytics)
    {
      id: 'b-hist-1',
      booking_no: 'BK-1005',
      customer_id: 'c6',
      property_id: 'p1',
      check_in: getDateOffset(-10),
      check_out: getDateOffset(-7),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Heritage Deluxe',
      base_amount: 12000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 2160,
      grand_total: 14160,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-20)
    },
    {
      id: 'b-hist-2',
      booking_no: 'BK-1004',
      customer_id: 'c9',
      property_id: 'p2',
      check_in: getDateOffset(-18),
      check_out: getDateOffset(-15),
      nights: 3,
      rooms: 2,
      guests: 4,
      room_type: 'Family Villa',
      base_amount: 30000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 5400,
      grand_total: 35400,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-25)
    },
    {
      id: 'b-hist-3',
      booking_no: 'BK-1003',
      customer_id: 'c1',
      property_id: 'p5',
      check_in: getDateOffset(-28),
      check_out: getDateOffset(-26),
      nights: 2,
      rooms: 1,
      guests: 1,
      room_type: 'Deluxe Studio',
      base_amount: 10000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 1800,
      grand_total: 11800,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-35)
    },
    {
      id: 'b-hist-4',
      booking_no: 'BK-1002',
      customer_id: 'c4',
      property_id: 'p3',
      check_in: getDateOffset(-42),
      check_out: getDateOffset(-39),
      nights: 3,
      rooms: 1,
      guests: 2,
      room_type: 'Portuguese Suite',
      base_amount: 13500,
      tax_enabled: false,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: 13500,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-50)
    },
    {
      id: 'b-hist-5',
      booking_no: 'BK-1001',
      customer_id: 'c2',
      property_id: 'p2',
      check_in: getDateOffset(-60),
      check_out: getDateOffset(-56),
      nights: 4,
      rooms: 2,
      guests: 4,
      room_type: 'Tea Glamping Pod',
      base_amount: 36000,
      tax_enabled: true,
      tax_rate: 18,
      tax_amount: 6480,
      grand_total: 42480,
      booking_status: 'Checked Out',
      payment_status: 'Paid',
      created_at: getDateOffset(-70)
    }
  ];

  const payments: Payment[] = [
    // Payment for b-arr-1 (Advance)
    {
      id: 'pay-101',
      payment_no: 'PAY-9011',
      booking_id: 'b-arr-1',
      date: getDateOffset(-5),
      amount: 10000,
      method: 'UPI',
      ref_id: 'UPI9831920',
      purpose: 'Advance',
      status: 'Recorded',
      created_at: getDateOffset(-5)
    },
    // Payment for b-arr-2 (Full Payment)
    {
      id: 'pay-102',
      payment_no: 'PAY-9012',
      booking_id: 'b-arr-2',
      date: getDateOffset(-8),
      amount: 28320,
      method: 'Card',
      ref_id: 'TXN-9021-CARD',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-8)
    },

    // Payments for b-dep-1 (Two payments!)
    {
      id: 'pay-103',
      payment_no: 'PAY-9008A',
      booking_id: 'b-dep-1',
      date: getDateOffset(-10),
      amount: 20000,
      method: 'Bank Transfer',
      ref_id: 'NEFT-883921',
      purpose: 'Advance',
      status: 'Recorded',
      created_at: getDateOffset(-10)
    },
    {
      id: 'pay-104',
      payment_no: 'PAY-9008B',
      booking_id: 'b-dep-1',
      date: getDateOffset(0),
      amount: 22480,
      method: 'Card',
      ref_id: 'POS-77218',
      purpose: 'Final payment',
      status: 'Recorded',
      created_at: getDateOffset(0)
    },

    // Payment for b-dep-2 (Partial advance)
    {
      id: 'pay-105',
      payment_no: 'PAY-9009',
      booking_id: 'b-dep-2',
      date: getDateOffset(-7),
      amount: 5000,
      method: 'UPI',
      ref_id: 'UPI556102',
      purpose: 'Advance',
      status: 'Recorded',
      created_at: getDateOffset(-7)
    },

    // In-house payments
    {
      id: 'pay-106',
      payment_no: 'PAY-9010',
      booking_id: 'b-stay-1',
      date: getDateOffset(-4),
      amount: 18880,
      method: 'UPI',
      ref_id: 'UPI448102',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-4)
    },
    {
      id: 'pay-107',
      payment_no: 'PAY-9007',
      booking_id: 'b-stay-2',
      date: getDateOffset(-6),
      amount: 10000,
      method: 'Card',
      ref_id: 'TXN-0012-AXIS',
      purpose: 'Advance',
      status: 'Recorded',
      created_at: getDateOffset(-6)
    },

    // Upcoming advance
    {
      id: 'pay-108',
      payment_no: 'PAY-9015',
      booking_id: 'b-up-2',
      date: getDateOffset(-1),
      amount: 10000,
      method: 'UPI',
      ref_id: 'UPI773911',
      purpose: 'Advance',
      status: 'Recorded',
      created_at: getDateOffset(-1)
    },
    {
      id: 'pay-109',
      payment_no: 'PAY-9016',
      booking_id: 'b-up-3',
      date: getDateOffset(0),
      amount: 21240,
      method: 'Card',
      ref_id: 'TXN-9912-HDFC',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(0)
    },

    // Historical Payments
    {
      id: 'pay-110',
      payment_no: 'PAY-9005',
      booking_id: 'b-hist-1',
      date: getDateOffset(-20),
      amount: 14160,
      method: 'UPI',
      ref_id: 'UPI-HIST-01',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-20)
    },
    // Historical Payment with Refund scenario
    {
      id: 'pay-111',
      payment_no: 'PAY-9004A',
      booking_id: 'b-hist-2',
      date: getDateOffset(-25),
      amount: 35400,
      method: 'Bank Transfer',
      ref_id: 'IMPS-HIST-02',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-25)
    },
    {
      id: 'pay-112',
      payment_no: 'PAY-9004-REFUND',
      booking_id: 'b-hist-2',
      date: getDateOffset(-15),
      amount: 5000,
      method: 'Bank Transfer',
      ref_id: 'REFUND-IMPS-02',
      purpose: 'Early checkout adjustment',
      status: 'Refunded',
      created_at: getDateOffset(-15)
    },
    {
      id: 'pay-113',
      payment_no: 'PAY-9003',
      booking_id: 'b-hist-3',
      date: getDateOffset(-35),
      amount: 11800,
      method: 'Card',
      ref_id: 'TXN-HIST-03',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-35)
    },
    {
      id: 'pay-114',
      payment_no: 'PAY-9002',
      booking_id: 'b-hist-4',
      date: getDateOffset(-50),
      amount: 13500,
      method: 'Cash',
      ref_id: 'CASH-REC-01',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-50)
    },
    {
      id: 'pay-115',
      payment_no: 'PAY-9001',
      booking_id: 'b-hist-5',
      date: getDateOffset(-70),
      amount: 42480,
      method: 'UPI',
      ref_id: 'UPI-HIST-05',
      purpose: 'Full payment',
      status: 'Recorded',
      created_at: getDateOffset(-70)
    }
  ];

  return {
    settings: {
      name: 'Serene Hospitality Group',
      legalName: 'Serene Hospitality & Stays Pvt. Ltd.',
      gstin: '29ABCDE1234F1Z5',
      address: 'Suite 401, Heritage Towers, MG Road, Bengaluru, Karnataka 560001',
      phone: '+91 80 2345 6789',
      email: 'operations@serenestays.in',
      invoicePrefix: 'INV-',
      receiptPrefix: 'PAY-',
      defaultTaxRate: 12,
      termsConditions: 'Government photo ID required at check-in. Non-smoking suites. Pets permitted upon prior notice.',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in date. Late cancellations incur a 1-night tariff retention.'
    },
    properties,
    customers,
    bookings,
    payments,
    notifications: []
  };
}

class DemoRepositoryImpl implements IRepository {
  private db: DemoDB;

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.db = JSON.parse(stored);
      } catch (e) {
        this.db = getInitialData();
        this.save();
      }
    } else {
      this.db = getInitialData();
      this.save();
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
  }

  // --- Properties ---
  async getProperties(): Promise<Property[]> {
    return [...this.db.properties];
  }

  async getProperty(id: string): Promise<Property | null> {
    return this.db.properties.find(p => p.id === id) || null;
  }

  async createProperty(data: Omit<Property, 'id' | 'created_at'>): Promise<Property> {
    const prop: Property = {
      ...data,
      id: generateId('prop-'),
      created_at: new Date().toISOString()
    };
    this.db.properties.push(prop);
    this.save();
    return prop;
  }

  async updateProperty(id: string, data: Partial<Property>): Promise<Property> {
    const index = this.db.properties.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Property not found');
    this.db.properties[index] = { ...this.db.properties[index], ...data };
    this.save();
    return this.db.properties[index];
  }

  // --- Customers / Guests ---
  async getCustomers(): Promise<Customer[]> {
    return [...this.db.customers];
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return this.db.customers.find(c => c.id === id) || null;
  }

  async createCustomer(data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const cust: Customer = {
      ...data,
      id: generateId('guest-'),
      created_at: new Date().toISOString()
    };
    this.db.customers.push(cust);
    this.save();
    return cust;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const index = this.db.customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    this.db.customers[index] = { ...this.db.customers[index], ...data };
    this.save();
    return this.db.customers[index];
  }

  // --- Bookings ---
  async getBookings(propertyId?: string): Promise<Booking[]> {
    let list = this.db.bookings;
    if (propertyId) {
      list = list.filter(b => b.property_id === propertyId);
    }
    // Hydrate customer and property for instant convenience
    return list.map(b => ({
      ...b,
      customer: this.db.customers.find(c => c.id === b.customer_id),
      property: this.db.properties.find(p => p.id === b.property_id)
    }));
  }

  async getBooking(id: string): Promise<Booking | null> {
    const b = this.db.bookings.find(item => item.id === id);
    if (!b) return null;
    return {
      ...b,
      customer: this.db.customers.find(c => c.id === b.customer_id),
      property: this.db.properties.find(p => p.id === b.property_id)
    };
  }

  async createBooking(data: Omit<Booking, 'id' | 'created_at'>): Promise<Booking> {
    const booking: Booking = {
      ...data,
      id: generateId('b-'),
      created_at: new Date().toISOString()
    };
    this.db.bookings.push(booking);
    this.save();
    return {
      ...booking,
      customer: this.db.customers.find(c => c.id === booking.customer_id),
      property: this.db.properties.find(p => p.id === booking.property_id)
    };
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const index = this.db.bookings.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Booking not found');
    this.db.bookings[index] = { ...this.db.bookings[index], ...data };
    this.save();
    return {
      ...this.db.bookings[index],
      customer: this.db.customers.find(c => c.id === this.db.bookings[index].customer_id),
      property: this.db.properties.find(p => p.id === this.db.bookings[index].property_id)
    };
  }

  // --- Payments ---
  async getPayments(bookingId?: string): Promise<Payment[]> {
    if (bookingId) {
      return this.db.payments.filter(p => p.booking_id === bookingId);
    }
    return [...this.db.payments];
  }

  async getAllPayments(propertyId?: string): Promise<Payment[]> {
    let payments = [...this.db.payments];
    if (propertyId) {
      const propertyBookingIds = new Set(
        this.db.bookings.filter(b => b.property_id === propertyId).map(b => b.id)
      );
      payments = payments.filter(p => propertyBookingIds.has(p.booking_id));
    }
    return payments.map(p => {
      const booking = this.db.bookings.find(b => b.id === p.booking_id);
      return {
        ...p,
        booking: booking
          ? {
              ...booking,
              customer: this.db.customers.find(c => c.id === booking.customer_id),
              property: this.db.properties.find(prop => prop.id === booking.property_id)
            }
          : undefined
      };
    });
  }

  async createPayment(data: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const payment: Payment = {
      ...data,
      id: generateId('pay-'),
      created_at: new Date().toISOString()
    };
    this.db.payments.push(payment);

    // Sync booking payment status automatically
    const booking = this.db.bookings.find(b => b.id === payment.booking_id);
    if (booking) {
      const allBookingPayments = this.db.payments.filter(p => p.booking_id === booking.id);
      let totalPaid = 0;
      let totalRefunded = 0;
      for (const p of allBookingPayments) {
        if (p.status === 'Recorded' || p.status === 'Completed') totalPaid += Number(p.amount) || 0;
        else if (p.status === 'Refunded') totalRefunded += Number(p.amount) || 0;
      }
      const net = totalPaid - totalRefunded;
      if (net >= booking.grand_total) {
        booking.payment_status = 'Paid';
      } else if (net > 0) {
        booking.payment_status = 'Partially Paid';
      } else {
        booking.payment_status = 'Unpaid';
      }
    }

    this.save();
    return payment;
  }

  // --- Notifications ---
  async getNotifications(bookingId?: string): Promise<Notification[]> {
    if (bookingId) {
      return this.db.notifications.filter(n => n.booking_id === bookingId);
    }
    return [...this.db.notifications];
  }

  async createNotification(data: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const notif: Notification = {
      ...data,
      id: generateId('notif-'),
      created_at: new Date().toISOString()
    };
    this.db.notifications.push(notif);
    this.save();
    return notif;
  }

  // --- Settings ---
  async getSettings(): Promise<BusinessSettings> {
    return { ...this.db.settings };
  }

  async updateSettings(data: Partial<BusinessSettings>): Promise<BusinessSettings> {
    this.db.settings = { ...this.db.settings, ...data };
    this.save();
    return { ...this.db.settings };
  }

  // --- Reset Demo Data ---
  async resetDemoData(): Promise<void> {
    this.db = getInitialData();
    this.save();
  }
}

export const repository = new DemoRepositoryImpl();
