import { useRef, useCallback } from 'react';
import { hapticImpact, hapticNotification } from '@/lib/haptics';

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  /** Callback with current deltaX while swiping */
  onSwiping?: (deltaX: number) => void;
  /** Called when touch ends without crossing threshold */
  onSwipeReset?: () => void;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  onSwiping,
  onSwipeReset,
}: UseSwipeOptions): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine direction on first significant move
    if (isHorizontal.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }

    if (isHorizontal.current) {
      onSwiping?.(dx);
    }
  }, [onSwiping]);

  const onTouchEnd = useCallback(() => {
    // We don't have the final position in touchEnd, so we rely on the last onSwiping call.
    // Instead, track last delta.
    onSwipeReset?.();
  }, [onSwipeReset]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/**
 * Enhanced swipe hook that tracks state via ref for use in touchEnd.
 */
export function useSwipeAction({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const currentDelta = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);
  const crossedThreshold = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    currentDelta.current = 0;
    crossedThreshold.current = false;

    if (elementRef.current) {
      elementRef.current.style.transition = 'none';
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (isHorizontal.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }

    if (!isHorizontal.current) return;

    // RTL: swipe right (positive dx) = approve, swipe left (negative dx) = reject
    // Clamp the movement
    const clampedDx = Math.max(-150, Math.min(150, dx));
    currentDelta.current = clampedDx;

    // Haptic bump when crossing the threshold
    if (Math.abs(clampedDx) >= threshold && !crossedThreshold.current) {
      crossedThreshold.current = true;
      hapticImpact('Medium');
    } else if (Math.abs(clampedDx) < threshold && crossedThreshold.current) {
      crossedThreshold.current = false;
    }

    if (elementRef.current) {
      elementRef.current.style.transform = `translateX(${clampedDx}px)`;
      // Show color hint based on direction
      const opacity = Math.min(Math.abs(clampedDx) / threshold, 1) * 0.15;
      if (clampedDx > 0) {
        elementRef.current.style.backgroundColor = `rgba(34, 197, 94, ${opacity})`;
      } else {
        elementRef.current.style.backgroundColor = `rgba(239, 68, 68, ${opacity})`;
      }
    }
  }, [threshold]);

  const onTouchEnd = useCallback(() => {
    const delta = currentDelta.current;

    if (elementRef.current) {
      elementRef.current.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
      elementRef.current.style.transform = 'translateX(0)';
      elementRef.current.style.backgroundColor = '';
    }

    // RTL layout: positive delta = swiped right = approve
    if (delta > threshold && onSwipeRight) {
      hapticNotification('Success');
      onSwipeRight();
    } else if (delta < -threshold && onSwipeLeft) {
      hapticNotification('Warning');
      onSwipeLeft();
    }

    currentDelta.current = 0;
    isHorizontal.current = null;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  return {
    ref: elementRef,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
