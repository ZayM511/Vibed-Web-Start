'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';

export function PageLoadingIndicator() {
  const pathname = usePathname();
  const [, setIsLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // Start loading when pathname changes
    setIsLoading(true);
    setShowSpinner(false);

    let spinnerTimer: NodeJS.Timeout | null = null;
    let loadCompleteTimer: NodeJS.Timeout | null = null;

    // Set a 2-second timeout to show the spinner if still loading
    spinnerTimer = setTimeout(() => {
      setShowSpinner(true);
    }, 2000);

    // Listen for when the page is fully loaded
    const handleLoad = () => {
      setIsLoading(false);
      setShowSpinner(false);
      if (spinnerTimer) clearTimeout(spinnerTimer);
    };

    // Check if document is already loaded
    if (document.readyState === 'complete') {
      loadCompleteTimer = setTimeout(() => {
        handleLoad();
      }, 100);
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      if (spinnerTimer) clearTimeout(spinnerTimer);
      if (loadCompleteTimer) clearTimeout(loadCompleteTimer);
      window.removeEventListener('load', handleLoad);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {showSpinner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4">
            <Spinner
              variant="circle-filled"
              className="h-12 w-12 text-indigo-500"
            />
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
