"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Sun, Moon } from "lucide-react";
import Image from "next/image";

interface Slide {
  src: string;
  alt: string;
  caption: string;
  description: string;
}

const lightSlides: Slide[] = [
  {
    src: "/screenshots/light-1.png",
    alt: "JobFiltr Filters - Light Mode",
    caption: "Smart Filters",
    description: "Hide staffing firms, filter by job age, and more",
  },
  {
    src: "/screenshots/light-2.png",
    alt: "JobFiltr Keywords - Light Mode",
    caption: "Keyword Filtering",
    description: "Include or exclude keywords and companies",
  },
  {
    src: "/screenshots/light-3.png",
    alt: "JobFiltr Advanced Filters - Light Mode",
    caption: "Advanced Filters",
    description: "Salary range, templates, and recruiting badges",
  },
  {
    src: "/screenshots/light-4.png",
    alt: "JobFiltr Scanner - Light Mode",
    caption: "Job Scanner",
    description: "Scan any job for scams, spam, and ghost jobs",
  },
  {
    src: "/screenshots/light-5.png",
    alt: "JobFiltr Recent Scans - Light Mode",
    caption: "Recent Scans",
    description: "Track scan history and saved jobs",
  },
  {
    src: "/screenshots/light-6.png",
    alt: "JobFiltr Documents - Light Mode",
    caption: "Documents",
    description: "Cloud sync, to-do list, and resume storage",
  },
  {
    src: "/screenshots/light-7.png",
    alt: "JobFiltr File Management - Light Mode",
    caption: "File Management",
    description: "Cover letters, portfolio, and storage tracking",
  },
  {
    src: "/screenshots/light-8.png",
    alt: "JobFiltr Scan Results - Light Mode",
    caption: "Scan Results",
    description: "Legitimacy scores, risk analysis, and red flags",
  },
  {
    src: "/screenshots/light-ghost-1.png",
    alt: "Ghost Job Analysis - Risk Score",
    caption: "Ghost Job Analysis",
    description: "AI-powered detection with risk breakdown scores",
  },
  {
    src: "/screenshots/light-ghost-2.png",
    alt: "Ghost Job Analysis - Detection Signals",
    caption: "Detection Signals",
    description: "See exactly what triggered the ghost job warning",
  },
];

const darkSlides: Slide[] = [
  {
    src: "/screenshots/dark-1.png",
    alt: "JobFiltr Filters - Dark Mode",
    caption: "Smart Filters",
    description: "Hide staffing firms, filter by job age, and more",
  },
  {
    src: "/screenshots/dark-2.png",
    alt: "JobFiltr Keywords - Dark Mode",
    caption: "Keyword Filtering",
    description: "Include or exclude keywords and companies",
  },
  {
    src: "/screenshots/dark-3.png",
    alt: "JobFiltr Advanced Filters - Dark Mode",
    caption: "Advanced Filters",
    description: "Salary range, templates, and recruiting badges",
  },
  {
    src: "/screenshots/dark-4.png",
    alt: "JobFiltr Scanner - Dark Mode",
    caption: "Job Scanner",
    description: "Scan any job for scams, spam, and ghost jobs",
  },
  {
    src: "/screenshots/dark-5.png",
    alt: "JobFiltr Recent Scans - Dark Mode",
    caption: "Recent Scans",
    description: "Track scan history and saved jobs",
  },
  {
    src: "/screenshots/dark-6.png",
    alt: "JobFiltr Documents - Dark Mode",
    caption: "Documents",
    description: "Cloud sync, to-do list, and resume storage",
  },
  {
    src: "/screenshots/dark-7.png",
    alt: "JobFiltr File Management - Dark Mode",
    caption: "File Management",
    description: "Cover letters, portfolio, and storage tracking",
  },
  {
    src: "/screenshots/dark-8.png",
    alt: "JobFiltr Scan Results - Dark Mode",
    caption: "Scan Results",
    description: "Legitimacy scores, risk analysis, and red flags",
  },
];

export function ScreenshotSlideshow() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const activeSlides = mode === "light" ? lightSlides : darkSlides;

  const paginate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setCurrent((prev) => (prev + dir + activeSlides.length) % activeSlides.length);
    },
    [activeSlides.length]
  );

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  const handleModeSwitch = useCallback((newMode: "light" | "dark") => {
    setDirection(0);
    setCurrent(0);
    setMode(newMode);
  }, []);

  // Auto-advance every 8 seconds, pause when expanded
  useEffect(() => {
    if (expanded) return;
    const timer = setInterval(() => paginate(1), 8000);
    return () => clearInterval(timer);
  }, [paginate, expanded]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) {
        setExpanded(false);
        return;
      }
      if (e.key === "ArrowLeft") paginate(-1);
      if (e.key === "ArrowRight") paginate(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [paginate, expanded]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div className="mt-20">
      <h3 className="text-2xl md:text-3xl font-bold text-center mb-4">
        <span className="text-white">See It In Action</span>
      </h3>
      <p className="text-center text-white/50 text-sm mb-8 max-w-lg mx-auto">
        See how JobFiltr looks in Light and Dark Mode
      </p>

      {/* Light / Dark toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-white/[0.06] rounded-xl border border-white/10 p-1">
          <button
            onClick={() => handleModeSwitch("light")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              mode === "light"
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <Sun className="h-4 w-4" />
            Light
          </button>
          <button
            onClick={() => handleModeSwitch("dark")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              mode === "dark"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            <Moon className="h-4 w-4" />
            Dark
          </button>
        </div>
      </div>

      <div className="relative max-w-sm mx-auto">
        {/* Phone-style frame */}
        <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.04] rounded-[2rem] border border-white/15 p-2 shadow-2xl shadow-black/40">
          {/* Inner screen area */}
          <div
            className="relative overflow-hidden rounded-[1.5rem] bg-[#1a1a2e]"
            style={{ aspectRatio: "390/580" }}
          >
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={`${mode}-${current}`}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.25 },
                  scale: { duration: 0.25 },
                }}
                className="absolute inset-0 cursor-zoom-in"
                onClick={() => setExpanded(true)}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) paginate(1);
                  else if (info.offset.x > 50) paginate(-1);
                }}
              >
                <Image
                  src={activeSlides[current].src}
                  alt={activeSlides[current].alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 90vw, 384px"
                  priority={current === 0}
                />
              </motion.div>
            </AnimatePresence>

            {/* Subtle bottom gradient for depth */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10" />
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => paginate(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 md:-translate-x-16 p-2 rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all backdrop-blur-sm"
          aria-label="Previous screenshot"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 md:translate-x-16 p-2 rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all backdrop-blur-sm"
          aria-label="Next screenshot"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Caption */}
        <div className="text-center mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${current}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-lg font-semibold text-white">
                {activeSlides[current].caption}
              </p>
              <p className="text-sm text-white/60 mt-1">
                {activeSlides[current].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {activeSlides.map((_, index) => (
            <button
              key={`${mode}-${index}`}
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? "w-6 bg-gradient-to-r from-cyan-400 to-blue-400"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide counter */}
        <p className="text-center text-xs text-white/30 mt-3">
          {current + 1} / {activeSlides.length}
        </p>
      </div>

      {/* Lightbox modal - portaled to body to escape stacking context */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
                onClick={() => setExpanded(false)}
              >
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative max-w-[90vw] max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={activeSlides[current].src}
                    alt={activeSlides[current].alt}
                    width={780}
                    height={1160}
                    className="rounded-xl object-contain max-h-[90vh] w-auto"
                    priority
                  />
                  <button
                    onClick={() => setExpanded(false)}
                    className="absolute -top-3 -right-3 p-2 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                    aria-label="Close expanded view"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="text-center mt-4">
                    <p className="text-lg font-semibold text-white">
                      {activeSlides[current].caption}
                    </p>
                    <p className="text-sm text-white/60 mt-1">
                      {activeSlides[current].description}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
