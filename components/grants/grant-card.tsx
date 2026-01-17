// components/grants/grant-card.tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WatchlistButton } from '@/components/watchlist';
import type { Grant } from '@/types';

interface GrantCardProps {
  grant: Grant;
}

export function GrantCard({ grant }: GrantCardProps) {
  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'Rolling';
    const date = new Date(deadline);
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return 'Expired';
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `${daysUntil} days left`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const providerTypeColors: Record<string, string> = {
    government: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    csr: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    private: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ngo: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge className={providerTypeColors[grant.provider_type] || ''} variant="secondary">
            {grant.provider_type.charAt(0).toUpperCase() + grant.provider_type.slice(1)}
          </Badge>
          <div className="flex items-center gap-2">
            {grant.deadline && (
              <span className="text-xs text-muted-foreground">
                {formatDeadline(grant.deadline)}
              </span>
            )}
            <WatchlistButton grantId={grant.id} grantName={grant.name} variant="icon" />
          </div>
        </div>
        <CardTitle className="text-lg line-clamp-2 mt-2">
          <Link href={`/grants/${grant.id}`} className="hover:text-primary transition-colors">
            {grant.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-1">
          {grant.provider}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {grant.description}
        </p>

        {/* Amount Range */}
        <div className="mb-3">
          <span className="text-lg font-semibold text-primary">
            {grant.amount_min && grant.amount_max ? (
              `${formatAmount(grant.amount_min)} - ${formatAmount(grant.amount_max)}`
            ) : grant.amount_max ? (
              `Up to ${formatAmount(grant.amount_max)}`
            ) : (
              'Amount varies'
            )}
          </span>
        </div>

        {/* Sectors */}
        {grant.sectors.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {grant.sectors.slice(0, 3).map((sector) => (
              <Badge key={sector} variant="outline" className="text-xs">
                {sector.replace('_', ' ')}
              </Badge>
            ))}
            {grant.sectors.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{grant.sectors.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto">
          <Button asChild className="w-full">
            <Link href={`/grants/${grant.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
