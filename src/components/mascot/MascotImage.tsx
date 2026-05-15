/**
 * MascotImage — single source of truth for rendering wallet mascots.
 *
 * Resolves (kind, pose) via mascotService and renders the resulting asset
 * with consistent sizing, animation, and accessibility. Mascots are
 * decorative-only (aria-hidden); never rely on them to convey state.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  resolveMascot,
  type MascotKind,
  type MascotPose,
} from '@/services/mascots/mascotService';

export type MascotSize = 'sm' | 'md' | 'lg' | 'xl';
export type MascotAnimate =
  | 'none'
  | 'idle'
  | 'check-pop'
  | 'success-glow'
  | 'notification-pop';

const SIZE_PX: Record<MascotSize, number> = {
  sm: 64,
  md: 96,
  lg: 160,
  xl: 240,
};

const ANIMATE_CLASS: Record<MascotAnimate, string> = {
  none: '',
  idle: 'animate-float',
  'check-pop': 'animate-celebration-bounce',
  'success-glow': 'animate-glow',
  'notification-pop': 'animate-celebration-bounce',
};

interface MascotImageProps {
  kind: MascotKind;
  pose: MascotPose;
  size?: MascotSize;
  animate?: MascotAnimate;
  /** Optional Tailwind classes — appended after the built-in sizing/animation. */
  className?: string;
  /**
   * When `true`, the browser will fetch the image immediately (use for above-
   * the-fold hero mascots). Defaults to `false` so secondary mascots lazy-load.
   */
  priority?: boolean;
}

export function MascotImage({
  kind,
  pose,
  size = 'md',
  animate = 'idle',
  className,
  priority = false,
}: MascotImageProps) {
  const reduceMotion = useReducedMotion();
  const { url, fallback } = useMemo(() => resolveMascot(kind, pose), [kind, pose]);
  const dim = SIZE_PX[size];

  // Family group is a wide aspect (3:2); keep its width-driven sizing rather
  // than forcing square dimensions onto a portrait box.
  const isWide = kind === 'family' && pose === 'all';
  const widthPx = isWide ? dim * 1.5 : dim;

  const animationClass = reduceMotion ? '' : ANIMATE_CLASS[animate];

  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      width={widthPx}
      height={dim}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      data-mascot-kind={kind}
      data-mascot-pose={pose}
      data-mascot-fallback={fallback || undefined}
      className={cn('object-contain select-none pointer-events-none', animationClass, className)}
      draggable={false}
    />
  );
}
