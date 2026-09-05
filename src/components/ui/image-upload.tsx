'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadImageAction } from '@/lib/storage/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  UploadCloud,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
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
  folder = 'general',
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

  function handleRemove() {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Extract clean filename from URL without raw timestamp prefix
  const rawFileName = value ? value.split('/').pop() || 'image' : '';
  const cleanFileName = rawFileName.replace(/^\d+-/, '');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label ? <Label className="text-xs font-medium">{label}</Label> : <div />}
        {!value && (
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md text-[11px]">
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`px-2 py-0.5 rounded transition-colors ${
                tab === 'upload' ? 'bg-background shadow-xs font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setTab('url')}
              className={`px-2 py-0.5 rounded transition-colors ${
                tab === 'url' ? 'bg-background shadow-xs font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Paste URL
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="hidden"
        onChange={handleFileSelected}
        disabled={isUploading}
      />

      {value ? (
        <div className="relative rounded-xl border bg-card/60 p-3 flex items-center gap-3.5 shadow-xs">
          {/* Thumbnail preview */}
          <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-muted/40 shrink-0 flex items-center justify-center">
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-contain p-0.5"
              unoptimized
            />
          </div>

          {/* Clean image details */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold truncate text-foreground leading-tight" title={cleanFileName}>
              {cleanFileName}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 gap-1 font-normal py-0 px-1.5 h-4"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                Cloud Saved
              </Badge>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <span>Preview</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-7 text-xs px-2.5 gap-1.5"
              title="Replace image"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>Replace</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Remove image"
              aria-label="Remove image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : tab === 'upload' ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all flex flex-col items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="text-xs font-medium text-muted-foreground">Uploading to Supabase Storage…</p>
            </>
          ) : (
            <>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UploadCloud className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Click to upload or drag & drop</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WebP, SVG up to 5MB</p>
              </div>
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
            className="text-xs"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
