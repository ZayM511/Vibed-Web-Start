"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface ManualScanFormProps {
  onScan: (data: { jobInput: string; context?: string }) => Promise<void>;
  isScanning: boolean;
}

export function ManualScanForm({ onScan, isScanning }: ManualScanFormProps) {
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [context, setContext] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const jobInput = inputMode === "url" ? jobUrl : jobText;

    if (!jobInput.trim()) {
      return;
    }

    await onScan({
      jobInput: jobInput.trim(),
      context: context.trim() || undefined,
    });
  };

  const isFormValid = inputMode === "url"
    ? jobUrl.trim().length > 0
    : jobText.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Job Scan</CardTitle>
        <CardDescription>
          Paste a job posting URL or the full job description text to analyze for red flags
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "url" | "text")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">Job URL</TabsTrigger>
              <TabsTrigger value="text">Job Text</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-url">Job Posting URL</Label>
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://example.com/job-posting"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={isScanning}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL of the job posting you want to analyze
                </p>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-text">Job Description Text</Label>
                <Textarea
                  id="job-text"
                  placeholder="Paste the complete job description here..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  disabled={isScanning}
                  rows={10}
                />
                <p className="text-sm text-muted-foreground">
                  Copy and paste the entire job posting including title, company, requirements, etc.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="context">Additional Context (Optional)</Label>
            <Textarea
              id="context"
              placeholder="e.g., I'm a junior developer with 2 years experience, located in San Francisco..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={isScanning}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Provide your background or situation for more personalized analysis
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!isFormValid || isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="animate-spin" />
                Analyzing Job Posting...
              </>
            ) : (
              "Scan Job Posting"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
