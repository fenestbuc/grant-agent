'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SaveToWatchlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grantId: string;
  grantName: string;
  onSaved: () => void;
}

export function SaveToWatchlistModal({
  open,
  onOpenChange,
  grantId,
  grantName,
  onSaved,
}: SaveToWatchlistModalProps) {
  const [notifyDeadline, setNotifyDeadline] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_id: grantId,
          notify_deadline: notifyDeadline,
          notify_changes: notifyChanges,
        }),
      });

      if (response.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Watchlist</DialogTitle>
          <DialogDescription>
            Save &quot;{grantName}&quot; and configure notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="notify-deadline"
              checked={notifyDeadline}
              onCheckedChange={(checked) => setNotifyDeadline(checked === true)}
            />
            <Label htmlFor="notify-deadline" className="cursor-pointer">
              Notify me about deadline (7 days and 1 day before)
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="notify-changes"
              checked={notifyChanges}
              onCheckedChange={(checked) => setNotifyChanges(checked === true)}
            />
            <Label htmlFor="notify-changes" className="cursor-pointer">
              Notify me when this grant is updated
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save to Watchlist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
