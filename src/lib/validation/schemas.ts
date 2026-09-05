import { z } from 'zod';

// ── Shudhham Products ─────────────────────────────────────────

export const shudhhamProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters'),
  price: z.number({ invalid_type_error: 'Price must be a number' }).gt(0, 'Price must be greater than ₹0'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

// ── BuildKart Products ────────────────────────────────────────

export const buildKartProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters'),
  price: z.number({ invalid_type_error: 'Selling price must be a number' }).gt(0, 'Selling price must be greater than ₹0'),
  original_price: z.number().nullable().optional(),
  discount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').nullable().optional(),
  stock: z.number({ invalid_type_error: 'Stock must be a number' }).int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  category: z.string().trim().min(1, 'Category is required'),
  subcategory: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_bestseller: z.boolean().optional(),
});

// ── Houserve Services ─────────────────────────────────────────

export const houserveServiceSchema = z.object({
  name: z.string().trim().min(2, 'Service name must be at least 2 characters'),
  price: z.number({ invalid_type_error: 'Price must be a number' }).gt(0, 'Price must be greater than ₹0'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().nullable().optional(),
  duration_minutes: z.number().int().min(5, 'Duration must be at least 5 minutes').nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// ── Houserve Promotions ───────────────────────────────────────

export const houservePromotionSchema = z.object({
  title: z.string().trim().min(2, 'Promotion title must be at least 2 characters'),
  subtitle: z.string().nullable().optional(),
  cta_text: z.string().nullable().optional(),
  bg_gradient: z.string().nullable().optional(),
  link_path: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  image_url: z.string().nullable().optional(),
});

// ── BuildKart Categories ──────────────────────────────────────

export const buildKartCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters'),
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens').optional(),
  sortOrder: z.number().int().optional(),
});

// ── Team Management ───────────────────────────────────────────

export const teamMemberInviteSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['super_admin', 'shudhham_admin', 'houserve_admin', 'buildkart_admin'], {
    errorMap: () => ({ message: 'Invalid role selected' }),
  }),
});

export const teamMemberRoleSchema = z.object({
  id: z.string().uuid('Invalid team member ID'),
  role: z.enum(['super_admin', 'shudhham_admin', 'houserve_admin', 'buildkart_admin'], {
    errorMap: () => ({ message: 'Invalid role selected' }),
  }),
});

export const teamMemberToggleActiveSchema = z.object({
  id: z.string().uuid('Invalid team member ID'),
  isActive: z.boolean(),
});

export const teamMemberRemoveSchema = z.object({
  id: z.string().uuid('Invalid team member ID'),
});

// ── Houserve Technicians ──────────────────────────────────────

export const technicianPromoteSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
});

export const technicianDemoteSchema = z.object({
  technicianId: z.string().uuid('Invalid technician ID'),
});

export const technicianUpdateSchema = z.object({
  id: z.string().uuid('Invalid technician ID'),
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').optional(),
});

export const technicianToggleActiveSchema = z.object({
  id: z.string().uuid('Invalid technician ID'),
  isActive: z.boolean(),
});

// ── Order & Booking Status ────────────────────────────────────

export const shudhhamOrderStatusSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
  status: z.string().trim().min(1, 'Status is required'),
});

export const buildKartOrderStatusSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
  status: z.enum(['Processing', 'Shipped', 'Delivered', 'Cancelled'], {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
});

export const bookingStatusSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  status: z.enum(['confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid booking status' }),
  }),
});

export const assignTechnicianSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  technicianId: z.string().uuid('Invalid technician ID'),
});

// ── Generic UUID & Bulk Operations ────────────────────────────

export const uuidSchema = z.string().uuid('Invalid UUID');

export const bulkProductUpdateSchema = z.object({
  ids: z.array(z.string().uuid('Invalid product ID')).min(1, 'At least one product must be selected'),
  patch: z.record(z.unknown()),
});
