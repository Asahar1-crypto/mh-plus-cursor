/**
 * Haptic feedback utility.
 * Uses Capacitor Haptics on native, falls back to navigator.vibrate on web (Android).
 */
import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'Heavy' | 'Medium' | 'Light';

let HapticsPlugin: any = null;

// Lazy-load the plugin
async function getHaptics() {
  if (HapticsPlugin !== null) return HapticsPlugin;
  if (!Capacitor.isNativePlatform()) {
    HapticsPlugin = false;
    return false;
  }
  try {
    const mod = await import('@capacitor/haptics');
    HapticsPlugin = mod.Haptics;
    return HapticsPlugin;
  } catch {
    HapticsPlugin = false;
    return false;
  }
}

/**
 * Trigger an impact haptic (tap feel).
 * @param style - Heavy for destructive, Medium for confirms, Light for taps
 */
export async function hapticImpact(style: ImpactStyle = 'Medium') {
  try {
    const haptics = await getHaptics();
    if (haptics) {
      const { ImpactStyle: IS } = await import('@capacitor/haptics');
      const map = { Heavy: IS.Heavy, Medium: IS.Medium, Light: IS.Light };
      await haptics.impact({ style: map[style] });
    } else if (navigator.vibrate) {
      const ms = style === 'Heavy' ? 30 : style === 'Medium' ? 15 : 8;
      navigator.vibrate(ms);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Trigger a notification haptic (success/warning/error).
 */
export async function hapticNotification(type: 'Success' | 'Warning' | 'Error' = 'Success') {
  try {
    const haptics = await getHaptics();
    if (haptics) {
      const { NotificationType } = await import('@capacitor/haptics');
      const map = { Success: NotificationType.Success, Warning: NotificationType.Warning, Error: NotificationType.Error };
      await haptics.notification({ type: map[type] });
    } else if (navigator.vibrate) {
      const patterns: Record<string, number[]> = {
        Success: [10, 50, 10],
        Warning: [20, 40, 20],
        Error: [30, 30, 30, 30, 30],
      };
      navigator.vibrate(patterns[type]);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Light selection tap - for toggle switches, list selections, etc.
 */
export async function hapticSelection() {
  try {
    const haptics = await getHaptics();
    if (haptics) {
      await haptics.selectionStart();
      await haptics.selectionEnd();
    } else if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  } catch {
    // Silently fail
  }
}
