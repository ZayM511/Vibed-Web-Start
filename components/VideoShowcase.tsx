"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const videos = [
  {
    src: "/videos/exclude-filters.mp4",
    label: "Exclude Filters",
    description: "Filter out unwanted job listings on LinkedIn",
    color: "from-cyan-500 to-blue-500",
    urlBar: "linkedin.com/jobs",
  },
  {
    src: "/videos/badge-showcase.mp4",
    label: "Job Badges",
    description: "Real-time job analysis badges on Indeed",
    color: "from-indigo-500 to-purple-500",
    urlBar: "indeed.com/jobs",
  },
  {
    src: "/videos/spam-scanner.mp4",
    label: "Spam Scanner",
    description: "Scan jobs for scams and spam on LinkedIn",
    color: "from-amber-500 to-yellow-500",
    urlBar: "linkedin.com/jobs",
  },
  {
    src: "/videos/staffing-filter.mp4",
    label: "Staffing Filter",
    description: "Identify and filter staffing agency postings",
    color: "from-rose-500 to-pink-500",
    urlBar: "linkedin.com/jobs",
  },
];

export function VideoShowcase() {
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const paginate = useCallback((dir: number) => {
    setCurrent((prev) => (prev + dir + videos.length) % videos.length);
  }, []);

  // When the current video changes, load and play the new one
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});
  }, [current]);

  return (
    <div className="mt-20 mb-8">
      <h3 className="text-2xl md:text-3xl font-bold text-center mb-4">
        <span className="text-white">See It In Action</span>
      </h3>
      <p className="text-center text-white/50 text-sm mb-10 max-w-lg mx-auto">
        See how JobFiltr works across platforms
      </p>

      {/* Video player area */}
      <div className="relative max-w-4xl mx-auto">
        {/* Browser-style frame */}
        <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.04] rounded-2xl border border-white/15 p-1.5 shadow-2xl shadow-black/40">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <div className="flex items-center gap-1">
              <div className="w-4 h-[3px] rounded-full bg-white/30" />
              <div className="w-4 h-[3px] rounded-full bg-white/30" />
              <div className="w-4 h-[3px] rounded-full bg-white/30" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white/[0.06] rounded-lg px-4 py-1.5 text-xs text-white/40 text-center truncate">
                {videos[current].urlBar}
              </div>
            </div>
          </div>

          {/* Video container */}
          <div className="relative overflow-hidden rounded-b-xl bg-black">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <video
                  ref={videoRef}
                  className="w-full block"
                  loop
                  muted
                  playsInline
                  autoPlay
                >
                  <source src={videos[current].src} type="video/mp4" />
                </video>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Arrow buttons */}
        <button
          onClick={() => paginate(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 md:-translate-x-14 p-2.5 rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all backdrop-blur-sm"
          aria-label="Previous video"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 md:translate-x-14 p-2.5 rounded-full bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all backdrop-blur-sm"
          aria-label="Next video"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Caption */}
        <div className="text-center mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-lg font-semibold text-white">
                {videos[current].label}
              </p>
              <p className="text-sm text-white/60 mt-1">
                {videos[current].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {videos.map((v, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-gradient-to-r " + v.color
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Watch ${v.label}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
