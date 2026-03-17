import { useState, useEffect, useCallback } from 'react';

const KEY = 'aao-test-mode';
const EVENT = 'aao-test-mode-change';

export function useTestMode() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) === 'true');

  // Listen for changes from other hook instances
  useEffect(() => {
    function onSync() {
      setEnabled(localStorage.getItem(KEY) === 'true');
    }
    window.addEventListener(EVENT, onSync);
    return () => window.removeEventListener(EVENT, onSync);
  }, []);

  const setTestMode = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setEnabled((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem(KEY, String(next));
      // Notify other hook instances
      window.dispatchEvent(new Event(EVENT));
      return next;
    });
  }, []);

  return { testMode: enabled, setTestMode };
}

export function isTestMode(): boolean {
  return localStorage.getItem(KEY) === 'true';
}
