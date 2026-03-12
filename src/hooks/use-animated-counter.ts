import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(target: number, duration: number = 800): number {
  const [current, setCurrent] = useState(0);
  const prevTarget = useRef(0);
  const rafId = useRef<number>();

  useEffect(() => {
    const start = prevTarget.current;
    const diff = target - start;

    if (diff === 0) return;

    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + diff * eased;

      setCurrent(value);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        prevTarget.current = target;
      }
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration]);

  return Math.round(current);
}
