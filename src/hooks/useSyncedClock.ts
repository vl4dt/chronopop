import { useState, useEffect } from 'react';

interface SyncedClockProps {
  startTimeMs?: number;
  baseTimeMs: number;
  isRunning: boolean;
  type: 'stopwatch' | 'timer';
}

export const useSyncedClock = ({ startTimeMs, baseTimeMs, isRunning, type }: SyncedClockProps) => {
  const [displayTime, setDisplayTime] = useState(baseTimeMs);

  useEffect(() => {
    // Initial sync
    if (!isRunning || !startTimeMs) {
      setDisplayTime(baseTimeMs);
      return;
    }

    const calculate = () => {
      const now = Date.now();
      const elapsedSinceStart = now - startTimeMs;
      
      if (type === 'stopwatch') {
        setDisplayTime(baseTimeMs + elapsedSinceStart);
      } else {
        // Timer
        const remaining = Math.max(0, baseTimeMs - elapsedSinceStart);
        setDisplayTime(remaining);
      }
    };

    calculate();
    const interval = setInterval(calculate, type === 'stopwatch' ? 10 : 100);

    return () => clearInterval(interval);
  }, [startTimeMs, baseTimeMs, isRunning, type]);

  return displayTime;
};
