/**
 * Shared formatting utilities for currency and amounts.
 * Canonical source — all components should import from here.
 */

/**
 * Format a numeric amount into a human-readable Indian currency string.
 * Returns 'N/A' for null/zero values.
 */
export function formatAmount(amount: number | null): string {
  if (!amount) return 'N/A';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}
