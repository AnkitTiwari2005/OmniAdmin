'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadImageAction } from '@/lib/storage/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, Link as LinkIcon, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = 'products',
  label = 'Image',
}: ImageUploadProps) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await uploadImageAction(formData);
    setIsUploading(false);

    if (res.error || !res.url) {
      toast({
        title: 'Upload Failed',
        description: res.error || 'Failed to upload image.',
        variant: 'destructive',
      });
      return;
    }

    onChange(res.url);
    setUrlInput(res.url);
    toast({
      title: 'Image Uploaded',
      description: 'Image saved to cloud storage successfully.',
      variant: 'success',
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const fakeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileSelected(fakeEvent);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md text-[11px]">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-2 py-0.5 rounded ${
              tab === 'upload' ? 'bg-background shadow-xs font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`px-2 py-0.5 rounded ${
              tab === 'url' ? 'bg-background shadow-xs font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            Paste URL
          </button>
        </div>
      </div>

      {value ? (
        <div className="relative rounded-lg border bg-muted/30 p-2 flex items-center gap-3">
          <div className="relative h-14 w-14 rounded-md overflow-hidden border bg-background shrink-0">
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate text-foreground">{value.split('/').pop() || 'Image URL'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{value}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              setUrlInput('');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : tab === 'upload' ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all flex flex-col items-center justify-center gap-1.5"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            onChange={handleFileSelected}
            disabled={isUploading}
          />
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="text-xs font-medium text-muted-foreground">Uploading to Supabase Storage…</p>
            </>
          ) : (
            <>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <UploadCloud className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium">Click to upload or drag & drop</p>
              <p className="text-[10px] text-muted-foreground">PNG, JPG, WebP, SVG up to 5MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onChange(urlInput)}
            disabled={!urlInput}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
