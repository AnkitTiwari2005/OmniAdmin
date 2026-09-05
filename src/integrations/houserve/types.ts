// ============================================================
// src/integrations/houserve/types.ts
// Full typed shapes returned by the Houserve API layer
// ============================================================

export interface HouserveKPIs {
  bookingsToday: number;
  revenueThisWeek: number;
  revenueTrend: number;
  totalCustomers: number;
  pendingBookings: number;
  activeBookings: number;
}

export interface HouserveRecentBooking {
  id: string;
  booking_ref: string;
  total_amount: number;
  status: string;
  payment_status: string;
  scheduled_date: string;
  customer_id: string;
}

export type BookingStatus =
  | 'confirmed'
  | 'assigned'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface HouserveBookingFull {
  id: string;
  booking_ref: string;
  customer_id: string;
  service_id: string | null;
  technician_id: string | null;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_time: string;
  address_snapshot: Record<string, string> | null;
  special_instructions: string | null;
  subtotal: number;
  platform_fee: number;
  gst_amount: number;
  total_amount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  // Joined
  customer: { full_name: string | null; email: string | null; phone: string | null } | null;
  service: { name: string; category: string } | null;
  technician: { full_name: string | null; phone: string | null } | null;
  booking_items: Array<{
    id: string;
    service_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    service: { name: string } | null;
  }>;
}

export interface HouserveService {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface HouserveTechnician {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  active_bookings?: number;
}

export interface HouserveCustomer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  razorpay_customer_id: string | null;
  booking_count?: number;
  created_at: string;
}

export interface HouservePayment {
  id: string;
  booking_ref: string;
  customer_id: string;
  total_amount: number;
  subtotal: number;
  platform_fee: number;
  gst_amount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: PaymentStatus;
  scheduled_date: string;
  created_at: string;
  customer: { full_name: string | null; email: string | null } | null;
}

// Status transition map — what can this status move to?
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  confirmed: ['assigned', 'cancelled'],
  assigned: ['accepted', 'cancelled'],
  accepted: ['on_the_way', 'cancelled'],
  on_the_way: ['in_progress'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  accepted: 'Accepted',
  on_the_way: 'On the Way',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, 'warning' | 'info' | 'success' | 'destructive' | 'secondary'> = {
  confirmed: 'warning',
  assigned: 'info',
  accepted: 'info',
  on_the_way: 'info',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'destructive',
};
