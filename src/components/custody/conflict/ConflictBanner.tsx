import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ConflictBannerProps {
  conflictCount: number;
  onResolve: () => void;
}

/** E1 — Red alert at top of calendar when there are conflicts. */
export const ConflictBanner: React.FC<ConflictBannerProps> = ({ conflictCount, onResolve }) => {
  if (conflictCount === 0) return null;
  return (
    <Alert variant="destructive" className="mb-3">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex-1">
          <AlertTitle>יש {conflictCount} התנגשויות בלו"ז</AlertTitle>
          <AlertDescription className="text-xs">
            שני ההורים רשומים באותם ימים. צריך להסכים על פתרון.
          </AlertDescription>
        </div>
        <Button size="sm" variant="outline" onClick={onResolve} className="shrink-0">
          פתור
          <ArrowLeft className="w-3 h-3 mr-1" />
        </Button>
      </div>
    </Alert>
  );
};
