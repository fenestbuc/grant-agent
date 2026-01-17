// components/kb/document-uploader.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DocumentUploaderProps {
  onUploadComplete: () => void;
}

export function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);

      const response = await fetch('/api/kb/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setProgress(100);
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-12 w-12 text-muted-foreground mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {isDragActive ? (
          <p className="text-primary font-medium">Drop the file here...</p>
        ) : (
          <>
            <p className="font-medium">Drag & drop a document here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              PDF, DOCX, TXT, CSV (max 10MB)
            </p>
          </>
        )}
      </div>

      {uploading && (
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
    </Card>
  );
}
