import React from 'react';
import { HomeIcon, Sparkles, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CustodyEmptyStateProps {
  onSetup: () => void;
  onLoadHolidaysOnly?: () => void;
}

/** D5 — Empty state when no pattern exists yet. */
export const CustodyEmptyState: React.FC<CustodyEmptyStateProps> = ({
  onSetup,
  onLoadHolidaysOnly,
}) => {
  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-col items-center text-center p-8 bg-card border border-dashed rounded-xl space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <HomeIcon className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">עדיין לא הגדרת לו"ז</h2>
          <p className="text-sm text-muted-foreground">
            כדי לראות מי עם הילדים בכל יום, הגדר תבנית שבועית.
          </p>
        </div>
        <Button onClick={onSetup} className="w-full">
          <Sparkles className="ml-2 h-4 w-4" />
          הגדר את הלו"ז שלי
        </Button>
        {onLoadHolidaysOnly && (
          <>
            <span className="text-xs text-muted-foreground">או</span>
            <Button variant="outline" onClick={onLoadHolidaysOnly} className="w-full">
              <PartyPopper className="ml-2 h-4 w-4" />
              רק תטען חגים וחופשות לשנה
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
