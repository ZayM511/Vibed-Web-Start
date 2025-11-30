"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Animated pulsing data points that create a subtle tech feel
 * Used to enhance the hero statement visually
 */
export function StatsPulse() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const pulsePoints = [
    { x: "15%", y: "20%", size: 4, delay: 0, duration: 3 },
    { x: "85%", y: "30%", size: 3, delay: 0.5, duration: 3.5 },
    { x: "25%", y: "70%", size: 5, delay: 1, duration: 4 },
    { x: "75%", y: "80%", size: 4, delay: 1.5, duration: 3.2 },
    { x: "50%", y: "15%", size: 3, delay: 2, duration: 3.8 },
    { x: "10%", y: "85%", size: 4, delay: 2.5, duration: 3.3 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {pulsePoints.map((point, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: point.x,
            top: point.y,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: point.duration,
            delay: point.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          {/* Outer glow */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 blur-xl"
            style={{
              width: `${point.size * 8}px`,
              height: `${point.size * 8}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
          {/* Inner core */}
          <div
            className="absolute inset-0 rounded-full bg-white"
            style={{
              width: `${point.size}px`,
              height: `${point.size}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </motion.div>
      ))}

      {/* Subtle scan lines */}
      <motion.div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(0deg, transparent 48%, rgba(255,255,255,0.1) 50%, transparent 52%)",
          backgroundSize: "100% 4px",
        }}
        animate={{
          y: ["0%", "100%"],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
    </div>
  );
}
