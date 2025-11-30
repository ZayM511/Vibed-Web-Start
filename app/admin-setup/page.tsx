"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSetupPage() {
  const { user, isSignedIn } = useUser();
  const [copied, setCopied] = useState(false);

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success("User ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Setup</CardTitle>
            <CardDescription>Please sign in to view your user ID</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Admin Setup - Your Clerk User ID</CardTitle>
          <CardDescription>
            Copy your user ID and add it to the ADMIN_USER_IDS array in convex/subscriptions.ts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70">Your Email</label>
            <p className="text-lg font-mono bg-white/5 p-3 rounded-lg border border-white/10">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-white/70">Your Clerk User ID</label>
            <div className="flex gap-2 mt-1">
              <p className="flex-1 text-lg font-mono bg-white/5 p-3 rounded-lg border border-white/10 break-all">
                {user.id}
              </p>
              <Button
                variant="outline"
                size="icon"
                onClick={copyUserId}
                className="h-12 w-12 shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-amber-400 mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/80">
              <li>Copy your user ID using the button above</li>
              <li>Open <code className="bg-white/10 px-1 py-0.5 rounded">convex/subscriptions.ts</code></li>
              <li>Find the <code className="bg-white/10 px-1 py-0.5 rounded">ADMIN_USER_IDS</code> array at the top</li>
              <li>Add your user ID to the array (example below)</li>
              <li>Save the file - Convex will auto-deploy</li>
            </ol>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-white/50 mb-2">Example:</p>
            <pre className="text-xs font-mono text-green-400 overflow-x-auto">
{`const ADMIN_USER_IDS = [
  "${user.id}",  // Your user ID
];`}
            </pre>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-400 mb-2">Admin Benefits:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
              <li>Unlimited scans (bypass free tier 3-scan limit)</li>
              <li>Full Pro dashboard access</li>
              <li>No subscription required</li>
              <li>All Pro features enabled</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
