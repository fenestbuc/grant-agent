# Knowledge Base Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a knowledge base where users upload startup documents (PDF, DOCX, TXT) that get processed into searchable embeddings for RAG-powered answer generation.

**Architecture:** File upload to Supabase Storage triggers Inngest background job. Job extracts text, generates embeddings via OpenAI, stores chunks in pgvector. UI shows upload progress and document status.

**Tech Stack:** react-dropzone, Supabase Storage, Inngest, OpenAI embeddings, pgvector

---

## Task 1: File Upload API Route

**Files:**
- Create: `app/api/kb/upload/route.ts`

**Step 1: Create the upload endpoint**

```typescript
// app/api/kb/upload/route.ts
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get startup
  const { data: startup, error: startupError } = await supabase
    .from('startups')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (startupError || !startup) {
    return NextResponse.json({ error: 'Startup profile not found' }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOCX, TXT, CSV' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Generate unique storage path
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const storagePath = `${startup.id}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('kb-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('kb_documents')
      .insert({
        startup_id: startup.id,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      // Clean up uploaded file
      await supabase.storage.from('kb-documents').remove([storagePath]);
      console.error('Document insert error:', docError);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // Trigger Inngest processing job
    await inngest.send({
      name: 'kb/document.uploaded',
      data: {
        documentId: document.id,
        startupId: startup.id,
        storagePath: storagePath,
        fileType: file.type,
      },
    });

    return NextResponse.json({
      data: document,
      message: 'File uploaded successfully. Processing started.',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓)"`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/api/kb/upload/route.ts
git commit -m "feat(api): add KB document upload endpoint"
```

---

## Task 2: Document List API Route

**Files:**
- Create: `app/api/kb/route.ts`

**Step 1: Create the documents list endpoint**

```typescript
// app/api/kb/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: startup } = await supabase
    .from('startups')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!startup) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
  }

  const { data: documents, error } = await supabase
    .from('kb_documents')
    .select('*')
    .eq('startup_id', startup.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: documents });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: startup } = await supabase
    .from('startups')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!startup) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
  }

  // Get document to verify ownership and get storage path
  const { data: document } = await supabase
    .from('kb_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('startup_id', startup.id)
    .single();

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Delete from storage
  await supabase.storage.from('kb-documents').remove([document.storage_path]);

  // Delete chunks first (foreign key)
  await supabase.from('kb_chunks').delete().eq('document_id', documentId);

  // Delete document record
  const { error } = await supabase
    .from('kb_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add app/api/kb/route.ts
git commit -m "feat(api): add KB documents list and delete endpoints"
```

---

## Task 3: Document Uploader Component

**Files:**
- Create: `components/kb/document-uploader.tsx`

**Step 1: Create the uploader component**

```typescript
// components/kb/document-uploader.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
  onUploadComplete?: () => void;
}

export function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (actual progress would need XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/kb/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setProgress(100);
      setSuccess(true);
      onUploadComplete?.();

      // Reset after delay
      setTimeout(() => {
        setSuccess(false);
        setProgress(0);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
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
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {isDragActive ? (
            <p className="text-primary font-medium">Drop the file here</p>
          ) : (
            <>
              <p className="font-medium">
                Drag & drop a file here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, DOCX, TXT, CSV (max 10MB)
              </p>
            </>
          )}
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
          File uploaded successfully! Processing will begin shortly.
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/kb/document-uploader.tsx
git commit -m "feat(ui): add DocumentUploader component with drag-and-drop"
```

---

## Task 4: Document List Component

**Files:**
- Create: `components/kb/document-list.tsx`

**Step 1: Create the document list component**

```typescript
// components/kb/document-list.tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { KBDocument } from '@/types';

interface DocumentListProps {
  documents: KBDocument[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Ready', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
};

const fileTypeIcons: Record<string, string> = {
  'application/pdf': '📄',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'text/plain': '📃',
  'text/csv': '📊',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DocumentList({
  documents,
  isLoading,
  onDelete,
  onRefresh,
}: DocumentListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId || !onDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/kb?id=${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(deleteId);
        onRefresh?.();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
        <p className="mt-2 text-muted-foreground">
          Upload your first document to build your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => {
          const status = statusConfig[doc.status] || statusConfig.pending;
          const icon = fileTypeIcons[doc.file_type] || '📄';

          return (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl">{icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      {doc.status === 'failed' && doc.error_message && (
                        <p className="text-sm text-red-600 mt-1">
                          {doc.error_message}
                        </p>
                      )}
                      {doc.status === 'completed' && doc.extracted_metadata && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {doc.extracted_metadata.sector && (
                            <Badge variant="outline" className="text-xs">
                              {doc.extracted_metadata.sector}
                            </Badge>
                          )}
                          {doc.extracted_metadata.company_name && (
                            <Badge variant="outline" className="text-xs">
                              {doc.extracted_metadata.company_name}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={status.color} variant="secondary">
                      {status.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(doc.id)}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This will also
              remove all processed chunks and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add components/kb/document-list.tsx
git commit -m "feat(ui): add DocumentList component with status and delete"
```

---

## Task 5: Knowledge Base Page

**Files:**
- Create: `app/(dashboard)/kb/page.tsx`

**Step 1: Create the KB page**

```typescript
// app/(dashboard)/kb/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { DocumentUploader } from '@/components/kb/document-uploader';
import { DocumentList } from '@/components/kb/document-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { KBDocument } from '@/types';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/kb');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();

    // Poll for status updates every 5 seconds if any documents are processing
    const interval = setInterval(() => {
      if (documents.some((d) => d.status === 'pending' || d.status === 'processing')) {
        fetchDocuments();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDocuments, documents]);

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const processingCount = documents.filter(
    (d) => d.status === 'pending' || d.status === 'processing'
  ).length;
  const completedCount = documents.filter((d) => d.status === 'completed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Upload documents about your startup to power AI-generated grant answers.
          </p>
        </div>
        <Button variant="outline" onClick={fetchDocuments}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Documents</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{documents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{processingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ready for Use</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Add pitch decks, business plans, one-pagers, or any documents that
            describe your startup. These will be used to generate grant application answers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploader onUploadComplete={fetchDocuments} />
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>
            {completedCount > 0
              ? `${completedCount} document${completedCount > 1 ? 's' : ''} ready for AI-powered answers`
              : 'Upload documents to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            onDelete={handleDelete}
            onRefresh={fetchDocuments}
          />
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips for Better Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Upload your pitch deck for company overview and traction data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Include business plans for detailed strategy and financial projections
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Add team bios or about pages for founder background
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              Upload product documentation for technical details
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/kb/page.tsx
git commit -m "feat(page): add Knowledge Base page with upload and list"
```

---

## Task 6: Component Index and Final Build

**Files:**
- Create: `components/kb/index.ts`

**Step 1: Create component index**

```typescript
// components/kb/index.ts
export { DocumentUploader } from './document-uploader';
export { DocumentList } from './document-list';
```

**Step 2: Run full build**

Run: `npm run build`
Expected: All routes compile successfully including `/kb`

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Knowledge Base phase (upload, processing, listing)"
```

---

## Summary

This plan implements the Knowledge Base with:

1. **Upload API** - Validates files, stores in Supabase Storage, triggers Inngest
2. **List/Delete API** - Fetches user's documents, handles deletion with cleanup
3. **DocumentUploader** - Drag-and-drop with progress indicator
4. **DocumentList** - Shows status badges, metadata, delete confirmation
5. **KB Page** - Stats, upload area, document list, tips

**Dependencies on Phase 1:**
- Inngest functions already defined in `lib/inngest/functions.ts`
- Document processing pipeline ready (extract → chunk → embed)

**Testing:** Upload a PDF, verify it appears with "Pending" status, then "Processing", then "Completed" with extracted metadata.
