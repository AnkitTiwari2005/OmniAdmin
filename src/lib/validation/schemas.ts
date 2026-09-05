import { z } from 'zod';

export const shudhhamProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters'),
  price: z.number({ invalid_type_error: 'Price must be a number' }).gt(0, 'Price must be greater than ₹0'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

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

export const houserveServiceSchema = z.object({
  name: z.string().trim().min(2, 'Service name must be at least 2 characters'),
  price: z.number({ invalid_type_error: 'Price must be a number' }).gt(0, 'Price must be greater than ₹0'),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().nullable().optional(),
  duration_minutes: z.number().int().min(5, 'Duration must be at least 5 minutes').nullable().optional(),
  image_url: z.string().nullable().optional(),
});

export const buildKartCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters'),
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens').optional(),
});
