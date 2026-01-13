import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

/**
 * Bulletproof Loading Protection Hook
 * Prevents infinite loading, handles timeouts, and manages cleanup
 */
export const useLoadingProtection = (options = {}) => {
   const {
      timeout = 30000, // 30 seconds default
      onTimeout,
      onError,
      showToast = true
   } = options;

   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState(null);
   const isMountedRef = useRef(true);
   const timeoutRef = useRef(null);
   const requestIdRef = useRef(0);

   // Cleanup on unmount
   useEffect(() => {
      return () => {
         isMountedRef.current = false;
         if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
         }
      };
   }, []);

   // Safe setState that only updates if component is mounted
   const safeSetState = useCallback((setter) => {
      if (isMountedRef.current) {
         setter();
      }
   }, []);

   // Reset loading state
   const reset = useCallback(() => {
      safeSetState(() => {
         setIsLoading(false);
         setError(null);
      });
      if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
         timeoutRef.current = null;
      }
   }, [safeSetState]);

   // Wrap async function with protection
   const safeAsync = useCallback(async (asyncFn, ...args) => {
      const currentRequestId = ++requestIdRef.current;

      // Clear any existing timeout
      if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
      }

      // Set loading state
      safeSetState(() => {
         setIsLoading(true);
         setError(null);
      });

      // Setup timeout protection
      timeoutRef.current = setTimeout(() => {
         if (isMountedRef.current && requestIdRef.current === currentRequestId) {
            safeSetState(() => {
               setIsLoading(false);
               setError('Request timeout');
            });

            if (showToast) {
               toast.error('Request took too long. Please try again.');
            }

            if (onTimeout) {
               onTimeout();
            }
         }
      }, timeout);

      try {
         const result = await asyncFn(...args);

         // Only update if this is still the current request and component is mounted
         if (isMountedRef.current && requestIdRef.current === currentRequestId) {
            clearTimeout(timeoutRef.current);
            safeSetState(() => {
               setIsLoading(false);
               setError(null);
            });
         }

         return result;
      } catch (err) {
         // Only update if this is still the current request and component is mounted
         if (isMountedRef.current && requestIdRef.current === currentRequestId) {
            clearTimeout(timeoutRef.current);

            const errorMessage = err.response?.data?.message || err.message || 'An error occurred';

            safeSetState(() => {
               setIsLoading(false);
               setError(errorMessage);
            });

            if (showToast) {
               toast.error(errorMessage);
            }

            if (onError) {
               onError(err);
            }
         }

         throw err;
      }
   }, [timeout, onTimeout, onError, showToast, safeSetState]);

   return {
      safeAsync,
      isLoading,
      error,
      reset,
      isMounted: isMountedRef.current
   };
};

/**
 * Network Status Monitoring Hook
 * Detects online/offline status
 */
export const useNetworkStatus = (options = {}) => {
   const { onOnline, onOffline } = options;
   const [isOnline, setIsOnline] = useState(navigator.onLine);
   const [wasOffline, setWasOffline] = useState(false);

   useEffect(() => {
      const handleOnline = () => {
         setIsOnline(true);
         setWasOffline(false);

         if (onOnline) {
            onOnline();
         }

         toast.success('Internet connection restored!');
      };

      const handleOffline = () => {
         setIsOnline(false);
         setWasOffline(true);

         if (onOffline) {
            onOffline();
         }

         toast.error('No internet connection. Please check your network.');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
      };
   }, [onOnline, onOffline]);

   return { isOnline, wasOffline };
};

export default useLoadingProtection;
