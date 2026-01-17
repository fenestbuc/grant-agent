'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LogoUploadProps {
  currentLogoUrl: string | null;
  startupName: string;
}

export function LogoUpload({ currentLogoUrl, startupName }: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = startupName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/startups/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setLogoUrl(result.data.logo_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleRemove = async () => {
    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/startups/upload-logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Delete failed');
      }

      setLogoUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxSize: 2 * 1024 * 1024, // 2MB
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="flex items-start gap-6">
      {/* Logo Preview */}
      <Avatar className="h-24 w-24 border-2 border-muted">
        {logoUrl && <AvatarImage src={logoUrl} alt={startupName} />}
        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Upload Controls */}
      <div className="flex-1 space-y-3">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-sm text-primary font-medium">Drop the image here</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                {logoUrl ? 'Replace logo' : 'Upload logo'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WebP (max 2MB)
              </p>
            </>
          )}
        </div>

        {logoUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="text-destructive hover:text-destructive"
          >
            Remove logo
          </Button>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
