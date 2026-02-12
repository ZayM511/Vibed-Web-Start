"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Download,
  MessageSquare,
  Menu,
  X,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { WAITLIST_MODE, FOUNDER_EMAILS } from "@/lib/feature-flags";

// Custom admin icon component
const AdminIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M12 2.15q.2 0 .363.025t.337.1l6 2.25q.575.225.938.725T20 6.375V9.5q0 .425-.287.713T19 10.5t-.712-.288T18 9.5V6.4l-6-2.25L6 6.4v4.7q0 1.25.363 2.5t1 2.375T8.913 18t1.987 1.475q.375.2.538.575t.012.75q-.175.4-.562.55t-.763-.05Q7.3 19.9 5.65 17.075T4 11.1V6.375q0-.625.363-1.125t.937-.725l6-2.25q.175-.075.35-.1T12 2.15M17 22q-2.075 0-3.537-1.463T12 17t1.463-3.537T17 12t3.538 1.463T22 17t-1.463 3.538T17 22m0-5q.625 0 1.063-.437T18.5 15.5t-.437-1.062T17 14t-1.062.438T15.5 15.5t.438 1.063T17 17m0 3q.625 0 1.175-.238t.975-.687q.125-.15.1-.337t-.225-.288q-.475-.225-.987-.337T17 18t-1.037.113t-.988.337q-.2.1-.225.288t.1.337q.425.45.975.688T17 20"/>
  </svg>
);

export function HeaderNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSignedIn, user } = useUser();

  // Check if user is a founder/admin
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!userEmail && FOUNDER_EMAILS.includes(userEmail);

  // Filter navigation items based on sign-in status and waitlist mode
  const allNavItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      description: "Return to homepage",
      requiresAuth: false,
      hideInWaitlist: false,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "View your analytics",
      requiresAuth: true,
      hideInWaitlist: true,
    },
  ];

  const mainNavItems = allNavItems.filter(
    (item) =>
      (!item.requiresAuth || isSignedIn) &&
      !(WAITLIST_MODE && item.hideInWaitlist)
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <nav className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 group">
            <img src="/jobfiltr-logo.png" alt="JobFiltr" className="h-8 w-8 object-contain transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white from-40% to-[#93c5fd]">
              JobFiltr
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Main Nav Items */}
            <div className="flex items-center gap-6">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Extension Link */}
            <button
              onClick={() => {
                // Navigate to homepage if not already there
                if (window.location.pathname !== "/") {
                  window.location.href = "/#extension";
                  return;
                }
                // If on homepage, scroll to extension section
                const extensionSection = document.getElementById("extension");
                if (extensionSection) {
                  const offset = 80;
                  const elementPosition = extensionSection.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - offset;
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                  });
                }
              }}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Extension</span>
            </button>

            {/* Contact */}
            <Link
              href="/contact"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Contact</span>
            </Link>

            {/* Admin - Only visible for admin user */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                <AdminIcon className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}

            {/* Auth - hidden in waitlist mode for non-signed-in users */}
            {(!WAITLIST_MODE || isSignedIn) && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
                {isSignedIn ? (
                  <UserButton
                    userProfileUrl="/dashboard"
                    userProfileMode="navigation"
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8",
                        userButtonPopoverCard: "bg-[#1a1a2e] border border-white/20",
                        userButtonPopoverMain: "text-white",
                        userButtonPopoverActions: "text-white",
                        userButtonPopoverActionButton: "text-white hover:bg-white/10",
                        userButtonPopoverActionButtonText: "!text-white",
                        userButtonPopoverActionButtonIcon: "!text-white",
                        userButtonPopoverFooter: "hidden",
                      },
                    }}
                  />
                ) : (
                  <>
                    <SignInButton mode="modal">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/70 hover:text-white hover:bg-white/5"
                      >
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                      >
                        Sign Up
                      </Button>
                    </SignUpButton>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white/70 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden border-t border-white/10"
            >
              <div className="py-4 space-y-4">
                {/* Main Nav Items */}
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Icon className="h-5 w-5 text-white/70" />
                      <div>
                        <p className="text-white text-sm font-medium">
                          {item.label}
                        </p>
                        <p className="text-white/50 text-xs">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}

                {/* Extension */}
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      // Navigate to homepage if not already there
                      if (window.location.pathname !== "/") {
                        window.location.href = "/#extension";
                        return;
                      }
                      // If on homepage, scroll to extension section
                      const extensionSection = document.getElementById("extension");
                      if (extensionSection) {
                        const offset = 80;
                        const elementPosition = extensionSection.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - offset;
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: "smooth",
                        });
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Download className="h-5 w-5 text-white/70" />
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">Extension</p>
                      <p className="text-white/50 text-xs">Download browser extension</p>
                    </div>
                  </button>
                </div>

                {/* Contact */}
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border-t border-white/10 pt-4"
                >
                  <MessageSquare className="h-5 w-5 text-white/70" />
                  <div>
                    <p className="text-white text-sm font-medium">Contact</p>
                    <p className="text-white/50 text-xs">
                      Feedback & Support
                    </p>
                  </div>
                </Link>

                {/* Admin - Only visible for admin user */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <AdminIcon className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white text-sm font-medium">Admin</p>
                      <p className="text-white/50 text-xs">
                        Admin Dashboard
                      </p>
                    </div>
                  </Link>
                )}

                {/* Auth - hidden in waitlist mode for non-signed-in users */}
                {(!WAITLIST_MODE || isSignedIn) && (
                  <div className="pt-4 border-t border-white/10">
                    {isSignedIn ? (
                      <div className="flex items-center gap-3 p-3">
                        <UserButton
                          userProfileUrl="/dashboard"
                          userProfileMode="navigation"
                          appearance={{
                            elements: {
                              avatarBox: "h-8 w-8",
                              userButtonPopoverCard: "bg-[#1a1a2e] border border-white/20",
                              userButtonPopoverMain: "text-white",
                              userButtonPopoverActions: "text-white",
                              userButtonPopoverActionButton: "text-white hover:bg-white/10",
                              userButtonPopoverActionButtonText: "!text-white",
                              userButtonPopoverActionButtonIcon: "!text-white",
                              userButtonPopoverFooter: "hidden",
                            },
                          }}
                        />
                        <p className="text-white text-sm">Account</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <SignInButton mode="modal">
                          <Button
                            variant="outline"
                            className="w-full border-white/20 hover:bg-white/5 text-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Sign In
                          </Button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                          <Button
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Sign Up
                          </Button>
                        </SignUpButton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
