import React from 'react';
import { Check, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PRESET_CATALOG,
  maskHasDay,
} from '@/lib/custody/presets';
import type { CustodyPresetKey } from '@/integrations/supabase/custodyTypes';
import { WEEKDAY_LABELS_HE } from '@/integrations/supabase/custodyTypes';

interface PresetCardProps {
  presetKey: CustodyPresetKey;
  selected: boolean;
  onSelect: () => void;
  /** Shown as a small "most popular" tag on week_on_week. */
  showPopularTag?: boolean;
}

/**
 * A selectable preset card showing a mini 7-day preview of the pattern.
 * For bi-weekly presets we only show week 1 (which is what the user will
 * hold in the "current week is mine" path).
 */
export const PresetCard: React.FC<PresetCardProps> = ({
  presetKey,
  selected,
  onSelect,
  showPopularTag,
}) => {
  const preset = PRESET_CATALOG[presetKey];
  const isCustom = preset.isCustom;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative flex flex-col text-right p-4 rounded-lg border-2 transition-all duration-200',
        'hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card',
      )}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground"
        >
          <Check className="w-3 h-3" />
        </span>
      )}
      {showPopularTag && !selected && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
          הכי נפוץ
        </span>
      )}

      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-bold leading-tight">{preset.labelHe}</h3>
        {isCustom && <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>

      <p className="text-xs text-muted-foreground leading-snug mb-3 min-h-[2rem]">
        {preset.descriptionHe}
      </p>

      {isCustom ? (
        <div className="text-[10px] text-muted-foreground text-center py-2 border border-dashed rounded">
          סמנ/י בעצמך
        </div>
      ) : (
        <PresetPreview mask={preset.mask1} />
      )}
    </button>
  );
};

const PresetPreview: React.FC<{ mask: number }> = ({ mask }) => (
  <div className="flex gap-0.5 justify-between" aria-hidden>
    {WEEKDAY_LABELS_HE.map((label, i) => {
      const isMine = maskHasDay(mask, i);
      return (
        <div
          key={i}
          className={cn(
            'flex-1 min-w-0 text-[9px] text-center py-1 rounded-sm border',
            isMine
              ? 'bg-primary/15 border-primary/40 text-primary'
              : 'bg-accent/10 border-accent/30 text-muted-foreground',
          )}
          title={`${label}${isMine ? ' — אני' : ' — ההורה השני'}`}
        >
          {label}
        </div>
      );
    })}
  </div>
);
