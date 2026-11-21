import { useState, useEffect } from 'react';

/**
 * Custom hook to smoothly animate a number count-up.
 * Respects prefers-reduced-motion: returns final target value immediately.
 */
export function useCountUp(target: number | string, durationMs: number = 800): number | string {
  const numericTarget = typeof target === 'number' ? target : parseFloat(String(target).replace(/[^0-9.-]/g, ''));
  const isNumeric = !isNaN(numericTarget) && isFinite(numericTarget);

  const [count, setCount] = useState<number>(() => {
    if (!isNumeric) return 0;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return numericTarget;
    }
    return 0;
  });

  useEffect(() => {
    if (!isNumeric) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(numericTarget);
      return;
    }

    if (numericTarget === 0) {
      setCount(0);
      return;
    }

    const startValue = 0;
    const diff = numericTarget - startValue;
    const startTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * easeProgress);

      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setCount(numericTarget);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [numericTarget, durationMs, isNumeric]);

  if (!isNumeric) {
    return target;
  }

  return count;
}
