'use server';

import { createAdminServiceClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadImageAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    await requireAdmin();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file || !(file instanceof File)) {
      return { error: 'No file provided for upload.' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: 'Invalid file type. Please upload a JPG, PNG, WebP, SVG, or GIF image.' };
    }

    if (file.size > MAX_SIZE) {
      return { error: 'File size exceeds the 5MB limit.' };
    }

    const service = createAdminServiceClient();
    const extension = file.name.split('.').pop() || 'jpg';
    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const filePath = `${folder}/${Date.now()}-${cleanName}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await service.storage
      .from('omni-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: pubData } = service.storage.from('omni-assets').getPublicUrl(filePath);
    return { url: pubData.publicUrl };
  } catch (err: any) {
    return { error: err.message || 'Failed to process image upload.' };
  }
}
