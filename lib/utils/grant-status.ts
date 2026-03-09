export type GrantApplicationStatus = 'open' | 'closing_soon' | 'closed' | 'rolling';

export function computeGrantStatus(grant: { deadline: string | null; is_active: boolean }): GrantApplicationStatus {
  if (!grant.is_active) return 'closed';
  if (!grant.deadline) return 'rolling'; // No deadline = rolling/always open

  const now = new Date();
  const deadline = new Date(grant.deadline);
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline < 0) return 'closed';
  if (daysUntilDeadline <= 7) return 'closing_soon';
  return 'open';
}

export function getStatusLabel(status: GrantApplicationStatus): string {
  switch (status) {
    case 'open': return 'Open';
    case 'closing_soon': return 'Closing Soon';
    case 'closed': return 'Closed';
    case 'rolling': return 'Rolling';
  }
}

export function getStatusColor(status: GrantApplicationStatus): string {
  switch (status) {
    case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'closing_soon': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
    case 'closed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'rolling': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  }
}
