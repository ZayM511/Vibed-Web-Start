"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignUpButton } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  return (
    <>
      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </>
  );
}

function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.push('/tasks');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <span className="text-xl font-mona-bold">VIBED</span>
        <p className="text-muted-foreground mt-2">Redirecting to tasks...</p>
      </div>
    </div>
  );
}

function SignInForm() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-5xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-8">
          {/* Logo/Brand */}
          <div className="inline-block">
            <h1 className="text-6xl md:text-7xl font-mona-heading mb-4 bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
              VIBED
            </h1>
          </div>

          {/* Problem Statement - Hero Copy */}
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <h2 className="text-2xl md:text-3xl font-mona-heading text-foreground leading-tight">
              The job market has a problem.
            </h2>

            <div className="space-y-4 text-lg md:text-xl text-muted-foreground leading-relaxed">
              <p>
                You're sending hundreds of applications into the void.
                <span className="text-foreground font-medium"> 59% never reach human eyes.</span>
              </p>

              <p>
                You're drowning in browser tabs, lost LinkedIn links, and forgotten follow-ups.
                The chaos isn't just overwhelming—
                <span className="text-foreground font-medium"> it's stealing your confidence, your energy, your vibe.</span>
              </p>

              <p className="text-xl md:text-2xl font-medium text-foreground pt-4">
                It's time to take back control.
              </p>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
            <p className="text-lg md:text-xl text-muted-foreground">
              VIBED transforms job search chaos into clarity.
              Track every application, organize every opportunity, and maintain your momentum—
              <span className="text-primary font-medium"> because your next career move deserves better than a scattered spreadsheet.</span>
            </p>
          </div>

          {/* Visual Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-600">
            <div className="bg-card border border-border rounded-lg p-6 transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
              <div className="text-4xl font-bold text-primary mb-2">79%</div>
              <p className="text-sm text-muted-foreground">of job seekers experience anxiety during their search</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 transition-all duration-300 hover:scale-105 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
              <div className="text-4xl font-bold text-purple-400 mb-2">59%</div>
              <p className="text-sm text-muted-foreground">believe their applications never reach a recruiter</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <p className="text-sm text-muted-foreground">in control when you track every move</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-800">
            <SignUpButton mode="modal">
              <button className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-medium transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:shadow-primary/30 active:scale-95">
                Start Your Journey
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto px-8 py-4 border-2 border-border rounded-lg text-lg font-medium transition-all duration-300 ease-in-out hover:bg-secondary hover:border-primary/50 hover:scale-105 hover:shadow-lg hover:shadow-secondary/20 active:scale-95">
                Sign In
              </button>
            </SignInButton>
          </div>

          {/* Tagline */}
          <p className="text-sm text-muted-foreground/70 mt-8 animate-in fade-in duration-1000 delay-1000">
            Keep your vibe. Land your dream job.
          </p>
        </div>
      </div>
    </div>
  );
}

