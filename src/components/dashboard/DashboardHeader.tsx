import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { MascotImage } from '@/components/mascot/MascotImage';

interface DashboardHeaderProps {
  userName: string | undefined;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName }) => {
  const greeting = "היי 👋";

  return (
    <Card className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden mb-4 sm:mb-6">
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 sm:gap-6">
          <div className="flex items-start gap-3 sm:gap-4 space-y-2 sm:space-y-3">
            {/* Mirror the mascot so she faces the greeting text. In our
                RTL flex-row the mascot lands on the right side and the
                greeting on the left — without scale-x-[-1] she gazes
                toward the wall, not toward the user's name. */}
            <MascotImage
              kind="blue"
              pose="happy"
              size="sm"
              animate="idle"
              priority
              className="shrink-0 -mt-1 scale-x-[-1]"
            />
            <div className="space-y-2 sm:space-y-3">
              <h2 className="type-h1 md:text-4xl type-gradient">
                {greeting}, {userName || 'משתמש'}!
              </h2>
              <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                בואו נראה איך התקציב שלכם מתנהל היום
              </p>
            </div>
          </div>

          {/* Date box (desktop only). The "הוצאה חדשה" CTA that lived here
              was removed — the same action is now exposed three times
              elsewhere on the page (QuickActionsRow + BottomNav FAB +
              empty-state CTA), so this slot was redundant. */}
          <div className="hidden md:flex flex-col items-end space-y-1 p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="text-sm font-medium text-muted-foreground">
              {new Date().toLocaleDateString('he-IL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};