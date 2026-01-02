"use client";

import { UltraEnhancedCommunityReviewForm } from "@/components/scanner/UltraEnhancedCommunityReviewForm";
import { ElegantBackground } from "@/components/ElegantBackground";
import { Id } from "@/convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";

// Mock data provider component
function MockScanResultsProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export default function ResultsDemoPage() {
  // Mock scan ID
  const mockScanId = "demo-scan-123" as Id<"jobScans">;

  return (
    <ElegantBackground>
      <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent mb-2">
            Enhanced Scan Results Demo
          </h1>
          <p className="text-white/70 text-lg">
            Beautiful, animated scan results with glass-morphism design
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-400/30 backdrop-blur-sm">
            <span className="text-amber-300 font-semibold">Note:</span>
            <span className="text-white/80">Using mock data for demonstration</span>
          </div>
        </div>

        {/* Mock scan results component with inline mock data */}
        <MockScanResultsProvider>
          <div className="space-y-8">
            {/* The component will show loading state since we can't actually query */}
            {/* In production, this would connect to real Convex data */}
            <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Demo Components</h2>
              <p className="text-white/70 mb-6">
                The enhanced components below showcase the new design system with animations and glass-morphism effects.
                In production, these would display real scan data from Convex.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-400/30">
                  <div className="text-3xl mb-2">✨</div>
                  <h3 className="font-bold text-white mb-2">Glass-morphism</h3>
                  <p className="text-sm text-white/70">Modern frosted glass effects with backdrop blur</p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-400/30">
                  <div className="text-3xl mb-2">🎬</div>
                  <h3 className="font-bold text-white mb-2">Smooth Animations</h3>
                  <p className="text-sm text-white/70">Framer Motion powered transitions</p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-400/30">
                  <div className="text-3xl mb-2">🎨</div>
                  <h3 className="font-bold text-white mb-2">Dynamic Theming</h3>
                  <p className="text-sm text-white/70">Color-coded based on scan results</p>
                </div>
              </div>
            </div>

            {/* Community Review Form Demo */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Community Review Form</h2>
              <UltraEnhancedCommunityReviewForm jobScanId={mockScanId} />
            </div>

            <Separator className="bg-white/20" />

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-400/30 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Job Posting Section
                </h3>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Animated legitimacy score with progress bar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Dynamic color themes based on scan results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Scam & ghost job detection cards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Smooth entrance animations</span>
                  </li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-500/5 border border-red-400/30 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🚩</span>
                  Red Flags Section
                </h3>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Severity-based color coding (high/medium/low)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Pulsing animations for high-severity flags</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Click to expand for more details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Staggered entrance animations</span>
                  </li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-400/30 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Web Research Section
                </h3>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Verification cards with status indicators</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Hover effects on each verification card</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Reputation sources display</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Rotating search icon animation</span>
                  </li>
                </ul>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-400/30 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  AI Analysis Section
                </h3>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Pulsing sparkles icon animation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Action buttons with hover effects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Export & share functionality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Detailed report request button</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </MockScanResultsProvider>
      </div>
    </ElegantBackground>
  );
}
