import { useState, useEffect } from 'react';
import { TimerRecord } from '@/lib/types';
import { getElapsedSeconds } from '@/lib/store';

export function useTimerTick(timer: TimerRecord | undefined) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!timer) { setElapsed(0); return; }
    if (timer.status === 'paused' || timer.status === 'stopped') {
      setElapsed(timer.total_seconds);
      return;
    }
    const update = () => setElapsed(getElapsedSeconds(timer));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timer?.id, timer?.status, timer?.started_at, timer?.total_seconds]);

  return elapsed;
}
