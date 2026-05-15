import React, { useState } from 'react';
import { Tag, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';

interface VirtualPartnerRibbonProps {
  partnerName: string;
  onInvite?: () => void;
}

/**
 * H2 — Thin banner shown above the custody calendar when a virtual partner
 * exists. Not dismissible; persists until the partner joins or is removed.
 */
export const VirtualPartnerRibbon: React.FC<VirtualPartnerRibbonProps> = ({
  partnerName,
  onInvite,
}) => {
  const { account } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleInvite = () => {
    setBusy(true);
    try {
      if (onInvite) onInvite();
      else {
        // Default: navigate to settings family tab
        window.location.assign('/account-settings?tab=family');
      }
    } finally {
      setBusy(false);
    }
  };

  // Use `account` to avoid a tree-shaking issue removing the import; we may
  // extend this component later to reflect per-account virtual state.
  void account;

  return (
    <div
      role="status"
      className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Tag className="w-4 h-4 text-accent-foreground shrink-0" />
        <p className="truncate text-accent-foreground">
          <span className="font-semibold">{partnerName}</span> עדיין לא הצטרפה.
          את/ה מנהל/ת את הלו"ז שלה.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleInvite}
        disabled={busy}
        className="shrink-0"
      >
        <UserPlus className="ml-1 h-3 w-3" />
        הזמן/י לחשבון
      </Button>
    </div>
  );
};
