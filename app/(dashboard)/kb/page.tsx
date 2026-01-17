// app/(dashboard)/kb/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { DocumentUploader } from '@/components/kb/document-uploader';
import { DocumentList } from '@/components/kb/document-list';
import { Skeleton } from '@/components/ui/skeleton';
import type { KBDocument } from '@/types';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/kb');
      const result = await response.json();
      if (response.ok) {
        setDocuments(result.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for status updates when documents are processing
  useEffect(() => {
    const hasProcessing = documents.some(
      (doc) => doc.status === 'pending' || doc.status === 'processing'
    );

    if (!hasProcessing) return;

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleUploadComplete = () => {
    fetchDocuments();
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Upload documents about your startup. Our AI will use them to generate personalized grant application answers.
        </p>
      </div>

      {/* Upload Section */}
      <DocumentUploader onUploadComplete={handleUploadComplete} />

      {/* Documents List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <DocumentList documents={documents} onDelete={handleDelete} />
      )}

      {/* Tips Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Tips for better AI answers</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Upload your pitch deck for company overview and traction data</li>
          <li>• Include team bios or LinkedIn profiles for team-related questions</li>
          <li>• Add financial projections or revenue data for funding questions</li>
          <li>• Upload product documentation for technical descriptions</li>
        </ul>
      </div>
    </div>
  );
}
