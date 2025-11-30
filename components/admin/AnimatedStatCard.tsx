"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface AnimatedStatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  gradient: string;
  delay?: number;
}

export function AnimatedStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  delay = 0,
}: AnimatedStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepValue = value / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className={`${gradient} backdrop-blur-xl border-white/20 overflow-hidden relative group hover:scale-105 transition-transform duration-300`}>
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,240,255,0.1),transparent_50%)]" />

        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white/80 text-sm font-medium tracking-wide uppercase">
              {title}
            </CardTitle>
            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
              <Icon className="h-5 w-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative">
          <div className="text-4xl font-bold text-white mb-1 font-mono tracking-tight">
            {displayValue.toLocaleString()}
          </div>
          {subtitle && (
            <p className="text-white/60 text-sm font-medium">{subtitle}</p>
          )}

          {/* Scan line effect */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
