import { useCallback, useRef, useEffect } from 'react';

/**
 * Returns a debounced version of the callback that delays invocation
 * until after `delay` milliseconds have elapsed since the last call.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced callback function
 */
export function useDebouncedCallback<
  T extends (...args: Parameters<T>) => void,
>(callback: T, delay = 300): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
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
}

/**
 * Clears any pending debounced calls.
 * Returns a ref that can be used to cancel debounced operations.
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
