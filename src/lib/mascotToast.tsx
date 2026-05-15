/**
 * mascotToast — opt-in toast helper that swaps Sonner's default icon for
 * a small mascot whose pose matches the toast type. Drop-in alternative
 * to the existing `toast` import from sonner — no global change needed.
 *
 * Usage:
 *   import { mascotToast } from '@/lib/mascotToast';
 *   mascotToast.success('שולם בהצלחה');
 *   mascotToast.error('משהו השתבש');
 *
 * Pose mapping uses the existing mascotService fallback chain so missing
 * 3D renders fall back to a sensible neighbor (or one of the 19 legacy
 * WebPs in /illustrations/).
 */
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { MascotImage } from '@/components/mascot/MascotImage';
import type { MascotPose } from '@/services/mascots/mascotService';

const ICON_SIZE_CLASS = '!h-8 !w-8'; // 32px — readable next to title without overpowering

function poseIcon(pose: MascotPose): ReactElement {
  return (
    <MascotImage
      kind="blue"
      pose={pose}
      size="sm"
      animate="none"
      className={ICON_SIZE_CLASS}
    />
  );
}

/** Sonner's per-toast options pruned to what callers actually pass. */
type ToastOpts = {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

export const mascotToast = {
  /** Default — neutral info ('checking' = "I'm looking at this") */
  info(message: string, opts?: ToastOpts) {
    return toast(message, { ...opts, icon: poseIcon('checking') });
  },

  /** Success — 'success' pose (winking + check badge) */
  success(message: string, opts?: ToastOpts) {
    return toast.success(message, { ...opts, icon: poseIcon('success') });
  },

  /** Error — 'error' pose (falls back to legacy error illustration) */
  error(message: string, opts?: ToastOpts) {
    return toast.error(message, { ...opts, icon: poseIcon('error') });
  },

  /** Warning — 'warning' pose */
  warning(message: string, opts?: ToastOpts) {
    return toast.warning(message, { ...opts, icon: poseIcon('warning') });
  },

  /** Loading / pending — 'thinking' pose */
  loading(message: string, opts?: ToastOpts) {
    return toast.loading(message, { ...opts, icon: poseIcon('thinking') });
  },

  /** Generic — escape hatch for custom poses (e.g. celebrate, paymentDone) */
  withPose(pose: MascotPose, message: string, opts?: ToastOpts) {
    return toast(message, { ...opts, icon: poseIcon(pose) });
  },

  /** Dismiss a toast by ID returned from one of the above */
  dismiss: toast.dismiss,
};
