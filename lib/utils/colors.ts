/**
 * Shared color maps for status badges across the application.
 * Canonical source — all components should import from here.
 */

/** Application status badge colors */
export const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  submitted: 'bg-green-100 text-green-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

/** Grant provider type badge colors */
export const providerTypeColors: Record<string, string> = {
  government: 'bg-blue-100 text-blue-800',
  csr: 'bg-purple-100 text-purple-800',
  private: 'bg-orange-100 text-orange-800',
  international: 'bg-green-100 text-green-800',
};

/** Knowledge base document status badge colors */
export const documentStatusColors: Record<string, string> = {
  uploading: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};
