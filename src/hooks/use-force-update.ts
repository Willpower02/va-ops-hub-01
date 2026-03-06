import { useState, useCallback } from 'react';

// Force re-render hook for localStorage changes
export function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick(t => t + 1), []);
}
