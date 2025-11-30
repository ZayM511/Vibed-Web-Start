'use client';

import * as React from 'react';
import { motion, useInView } from 'framer-motion';

type SlotMachineNumberProps = {
  finalNumber: number;
  className?: string;
};

export function SlotMachineNumber({ finalNumber, className }: SlotMachineNumberProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [currentNumber, setCurrentNumber] = React.useState(0);
  const hasAnimated = React.useRef(false);

  React.useEffect(() => {
    if (!isInView || hasAnimated.current) return;

    hasAnimated.current = true;

    // Animation sequence - each step has the number to show and delay AFTER showing it
    const sequence = [
      // Fast cycle through 0-9
      { num: 0, delayAfter: 30 },
      { num: 1, delayAfter: 30 },
      { num: 2, delayAfter: 30 },
      { num: 3, delayAfter: 30 },
      { num: 4, delayAfter: 30 },
      { num: 5, delayAfter: 30 },
      { num: 6, delayAfter: 30 },
      { num: 7, delayAfter: 30 },
      { num: 8, delayAfter: 30 },
      { num: 9, delayAfter: 30 },
      // Slow down for final approach
      { num: 0, delayAfter: 80 },
      { num: 1, delayAfter: 120 },
      { num: 2, delayAfter: 180 },
      { num: finalNumber, delayAfter: 0 }, // Final number - no more delays
    ];

    let currentIndex = 0;

    const runAnimation = () => {
      if (currentIndex >= sequence.length) {
        return;
      }

      const { num, delayAfter } = sequence[currentIndex];
      setCurrentNumber(num);
      currentIndex++;

      if (currentIndex < sequence.length) {
        setTimeout(runAnimation, delayAfter);
      }
    };

    runAnimation();
  }, [isInView, finalNumber]);

  return (
    <span ref={ref} className={className}>
      <motion.span
        key={currentNumber}
        initial={{ y: -8, opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.08, ease: 'easeOut' }}
      >
        {currentNumber}
      </motion.span>
    </span>
  );
}
