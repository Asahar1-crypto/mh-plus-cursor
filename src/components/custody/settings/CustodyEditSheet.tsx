import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { custodyPatternService } from '@/integrations/supabase/custodyService';
import {
  DEFAULT_CUSTODY_STATE,
  customWeekToMasks,
  type CustodyStepState,
} from '../onboarding/CustodyStepTypes';
import type { DaySlotState } from '../shared/WeekGridInput';
import { maskHasDay } from '@/lib/custody/presets';
import { PresetPicker } from '../onboarding/PresetPicker';
import { CustomWeekGrid } from '../onboarding/CustomWeekGrid';
import { HandoffTimePicker } from '../onboarding/HandoffTimePicker';
import { StartDateAndHolder } from '../onboarding/StartDateAndHolder';
import { PartnerPicker } from '../onboarding/PartnerPicker';
import { PRESET_CATALOG } from '@/lib/custody/presets';
import { supabase } from '@/integrations/supabase/client';
import type { CustodyPatternRow } from '@/integrations/supabase/custodyTypes';
import { toIsoDate } from '@/lib/custody/dateUtils';

function masksToCustomWeek(mask1: number, mask2: number | null): DaySlotState[] {
  const out: DaySlotState[] = [];
  for (let i = 0; i < 7; i++) {
    const inWeek1 = maskHasDay(mask1, i);
    const inWeek2 = mask2 === null ? inWeek1 : maskHasDay(mask2, i);
    if (inWeek1 && inWeek2) out.push('me');
    else if (!inWeek1 && !inWeek2) out.push('other');
    else out.push('alt'); // exactly one of the two weeks
  }
  return out;
}

interface CustodyEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPattern: CustodyPatternRow | null;
  onSaved: () => void;
}

type TabKey = 'preset' | 'handoff' | 'start' | 'partner';

/**
 * C3 — Edit sheet. Reuses the onboarding sub-step components but presents
 * them as tabs instead of a sequential wizard.
 */
export const CustodyEditSheet: React.FC<CustodyEditSheetProps> = ({
  open,
  onOpenChange,
  initialPattern,
  onSaved,
}) => {
  const isMobile = useIsMobile();
  const { user, account } = useAuth();
  const [tab, setTab] = useState<TabKey>('preset');
  const [state, setState] = useState<CustodyStepState>(DEFAULT_CUSTODY_STATE);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Hydrate from existing pattern when opened.
  useEffect(() => {
    if (!open) return;
    if (initialPattern) {
      setState({
        ...DEFAULT_CUSTODY_STATE,
        preset: initialPattern.preset_key,
        handoffTime: initialPattern.handoff_time.slice(0, 5),
        startDate: initialPattern.dtstart,
        currentWeekHolder: 'me',
        // For custom patterns, reconstruct the week layout from the masks so
        // the WeekGridInput shows the user's existing configuration.
        customWeek:
          initialPattern.preset_key === 'custom'
            ? masksToCustomWeek(
                initialPattern.weekday_mask_week1,
                initialPattern.weekday_mask_week2,
              )
            : DEFAULT_CUSTODY_STATE.customWeek,
      });
    } else {
      setState({
        ...DEFAULT_CUSTODY_STATE,
        startDate: toIsoDate(new Date()),
      });
    }
    setDirty(false);
    setTab('preset');
  }, [open, initialPattern]);

  const handleInnerChange: (u: (p: CustodyStepState) => CustodyStepState) => void = (u) => {
    setState((prev) => {
      const next = u(prev);
      setDirty(true);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.id || !account?.id || !state.preset || !state.startDate) {
      toast.error('חסרים פרטים לשמירה');
      return;
    }
    setSaving(true);
    try {
      const def = PRESET_CATALOG[state.preset];
      let mask1 = def.mask1;
      let mask2: number | null = def.mask2;
      if (def.isCustom) {
        const masks = customWeekToMasks(state.customWeek);
        mask1 = masks.mask1;
        mask2 = masks.hasAlt ? masks.mask2 : null;
      }
      if (state.currentWeekHolder === 'other' && mask2 !== null) {
        [mask1, mask2] = [mask2, mask1];
      }
      await custodyPatternService.upsert({
        accountId: account.id,
        ownerUserId: user.id,
        presetKey: state.preset,
        weekdayMaskWeek1: mask1,
        weekdayMaskWeek2: mask2,
        dtstart: state.startDate,
        handoffTime: state.handoffTime,
      });

      if (state.partnerMode === 'virtual' && state.virtualPartnerName.trim()) {
        await supabase
          .from('accounts')
          .update({ virtual_partner_name: state.virtualPartnerName.trim() })
          .eq('id', account.id);
      }

      toast.success('הלו"ז עודכן');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('שמירה נכשלה. נסו שוב.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && dirty) {
      const leave = window.confirm('לצאת בלי לשמור?');
      if (!leave) return;
    }
    onOpenChange(nextOpen);
  };

  const body = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} dir="rtl">
      <TabsList className="grid grid-cols-4 w-full mb-4">
        <TabsTrigger value="preset">תבנית</TabsTrigger>
        <TabsTrigger value="handoff">החלפה</TabsTrigger>
        <TabsTrigger value="start">תחילה</TabsTrigger>
        <TabsTrigger value="partner">הורה שני</TabsTrigger>
      </TabsList>

      <TabsContent value="preset" className="mt-0">
        {state.preset === 'custom' ? (
          <CustomWeekGrid
            state={state}
            setState={handleInnerChange}
            onNext={() => setTab('handoff')}
            onBack={() => setState((s) => ({ ...s, preset: null }))}
          />
        ) : (
          <PresetPicker
            state={state}
            setState={handleInnerChange}
            onNext={() => setTab('handoff')}
            onBack={() => handleClose(false)}
          />
        )}
      </TabsContent>

      <TabsContent value="handoff" className="mt-0">
        <HandoffTimePicker
          state={state}
          setState={handleInnerChange}
          onNext={() => setTab('start')}
          onBack={() => setTab('preset')}
        />
      </TabsContent>

      <TabsContent value="start" className="mt-0">
        <StartDateAndHolder
          state={state}
          setState={handleInnerChange}
          onNext={() => setTab('partner')}
          onBack={() => setTab('handoff')}
        />
      </TabsContent>

      <TabsContent value="partner" className="mt-0">
        <PartnerPicker
          state={state}
          setState={handleInnerChange}
          onNext={handleSave}
          onBack={() => setTab('start')}
        />
      </TabsContent>
    </Tabs>
  );

  const footer = (
    <div className="flex gap-3 pt-4 border-t mt-4">
      <Button
        variant="outline"
        onClick={() => handleClose(false)}
        disabled={saving}
        className="flex-1"
      >
        ביטול
      </Button>
      <Button onClick={handleSave} disabled={saving} className="flex-1">
        {saving ? 'שומר...' : 'שמור'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-right">
            <DrawerTitle>עריכת הלו"ז שלי</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {body}
            {footer}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="left" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right">עריכת הלו"ז שלי</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          {body}
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
};
