"use client";

import Link from "next/link";
import { GpcStatusBadge } from "./GpcBanner";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/" className="flex items-center gap-1 group">
              <img src="/jobfiltr-logo.png" alt="JobFiltr" className="h-6 w-6 object-contain transition-transform group-hover:scale-110" />
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white from-40% to-[#93c5fd]">
                JobFiltr
              </span>
            </Link>
            <span className="text-white/40 text-sm">
              © 2026 Groundwork Labs LLC. All rights reserved.
            </span>
            <GpcStatusBadge />
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
