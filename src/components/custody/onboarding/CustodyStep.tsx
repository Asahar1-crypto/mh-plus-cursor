import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { custodyPatternService } from '@/integrations/supabase/custodyService';
import { supabase } from '@/integrations/supabase/client';
import { PRESET_CATALOG } from '@/lib/custody/presets';
import type { OnboardingStepProps } from '@/components/onboarding/types';
import { PresetPicker } from './PresetPicker';
import { CustomWeekGrid } from './CustomWeekGrid';
import { HandoffTimePicker } from './HandoffTimePicker';
import { StartDateAndHolder } from './StartDateAndHolder';
import { PartnerPicker } from './PartnerPicker';
import { CustodyPreviewAndSave } from './CustodyPreviewAndSave';
import {
  DEFAULT_CUSTODY_STATE,
  customWeekHasAlternating,
  customWeekToMasks,
  presetNeedsStartDate,
  type CustodyStepState,
} from './CustodyStepTypes';

type SubStepId = 'preset' | 'custom' | 'handoff' | 'start_date' | 'partner' | 'preview';

/**
 * CustodyStep orchestrates a 6-screen sub-wizard inside the outer
 * OnboardingModal slot. It owns its own state and persists on A6.
 */
export const CustodyStep: React.FC<OnboardingStepProps> = ({ onNext, onBack, onSkip }) => {
  const { user, account, profile } = useAuth();
  const [state, setState] = useState<CustodyStepState>(DEFAULT_CUSTODY_STATE);
  const [subStep, setSubStep] = useState<SubStepId>('preset');
  const [isSaving, setIsSaving] = useState(false);

  const [hasExistingPartner, existingPartnerLabel] = useExistingPartner(account?.id, user?.id);

  const needsStartDate =
    presetNeedsStartDate(state.preset) ||
    (state.preset === 'custom' && customWeekHasAlternating(state.customWeek));

  const goForward = useCallback(() => {
    setSubStep((cur) => {
      if (cur === 'preset') {
        return state.preset === 'custom' ? 'custom' : 'handoff';
      }
      if (cur === 'custom') return 'handoff';
      if (cur === 'handoff') {
        return needsStartDate ? 'start_date' : 'partner';
      }
      if (cur === 'start_date') return 'partner';
      if (cur === 'partner') return 'preview';
      return cur;
    });
  }, [state.preset, needsStartDate]);

  const goBack = useCallback(() => {
    setSubStep((cur) => {
      if (cur === 'preset') {
        onBack();
        return cur;
      }
      if (cur === 'custom') return 'preset';
      if (cur === 'handoff') return state.preset === 'custom' ? 'custom' : 'preset';
      if (cur === 'start_date') return 'handoff';
      if (cur === 'partner') {
        return needsStartDate ? 'start_date' : 'handoff';
      }
      if (cur === 'preview') return 'partner';
      return cur;
    });
  }, [onBack, state.preset, needsStartDate]);

  const handleRestart = useCallback(() => {
    setState(DEFAULT_CUSTODY_STATE);
    setSubStep('preset');
  }, []);

  const handleSave = useCallback(async () => {
    const effectiveStartDate = state.startDate ?? (needsStartDate ? null : null);
    if (!user?.id || !account?.id || !state.preset) {
      toast.error('חסרים פרטים לשמירה');
      return;
    }
    if (needsStartDate && !effectiveStartDate) {
      toast.error('חסר תאריך התחלה');
      return;
    }
    const startDate =
      effectiveStartDate ?? new Date().toISOString().slice(0, 10);
    setIsSaving(true);
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
        // Bi-weekly: if the "other parent" holds the current week, swap the
        // masks so week 1 (phase 0) belongs to the other parent and this
        // user's mask1 is what phase 1 looks like. Since patterns are keyed
        // by owner_user_id, we store THIS user's week-1 mask — which is the
        // preset's mask2 when the current week is "other".
        [mask1, mask2] = [mask2, mask1];
      }

      await custodyPatternService.upsert({
        accountId: account.id,
        ownerUserId: user.id,
        presetKey: state.preset,
        weekdayMaskWeek1: mask1,
        weekdayMaskWeek2: mask2,
        dtstart: startDate,
        handoffTime: state.handoffTime,
      });

      // Handle the "virtual partner" side effect.
      if (state.partnerMode === 'virtual' && state.virtualPartnerName.trim()) {
        await supabase
          .from('accounts')
          .update({ virtual_partner_name: state.virtualPartnerName.trim() })
          .eq('id', account.id);
      }

      toast.success('הלו"ז נשמר בהצלחה');
      onNext();
    } catch (err) {
      console.error('Error saving custody pattern:', err);
      toast.error('לא הצלחנו לשמור. בדקו חיבור ונסו שוב.');
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, account?.id, state, needsStartDate, onNext]);

  const commonProps = useMemo(
    () => ({
      state,
      setState,
      onNext: goForward,
      onBack: goBack,
      hasExistingPartner,
      existingPartnerLabel,
    }),
    [state, goForward, goBack, hasExistingPartner, existingPartnerLabel],
  );

  switch (subStep) {
    case 'preset':
      return <PresetPicker {...commonProps} onSkipAll={onSkip} />;
    case 'custom':
      return <CustomWeekGrid {...commonProps} />;
    case 'handoff':
      return <HandoffTimePicker {...commonProps} />;
    case 'start_date':
      return <StartDateAndHolder {...commonProps} />;
    case 'partner':
      return <PartnerPicker {...commonProps} />;
    case 'preview':
      return (
        <CustodyPreviewAndSave
          {...commonProps}
          onSave={handleSave}
          onRestart={handleRestart}
          isSaving={isSaving}
        />
      );
  }
};

function useExistingPartner(accountId?: string, currentUserId?: string) {
  const [label, setLabel] = useState<[boolean, string | null]>([false, null]);

  React.useEffect(() => {
    if (!accountId || !currentUserId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('account_members')
        .select('user_id, profiles:profiles!user_id(name)')
        .eq('account_id', accountId);
      if (cancelled) return;
      if (error || !data) {
        setLabel([false, null]);
        return;
      }
      const other = data.find((m: { user_id: string }) => m.user_id !== currentUserId);
      if (!other) {
        setLabel([false, null]);
        return;
      }
      const profile = (other as unknown as { profiles?: { name?: string } }).profiles;
      setLabel([true, profile?.name ?? 'ההורה השני בחשבון']);
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, currentUserId]);

  return label;
}
