import { useCallback, useRef, useEffect } from 'react';

/**
 * Returns a debounced version of the callback that delays invocation
 * until after `delay` milliseconds have elapsed since the last call.
 * Also returns a cancel function to clear pending calls.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns [debouncedCallback, cancel] tuple
 */
export function useDebouncedCallbackWithCancel<
  T extends (...args: Parameters<T>) => void,
>(callback: T, delay = 300): [T, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );

  return [debouncedCallback, cancel];
}
