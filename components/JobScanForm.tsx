"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface JobScanFormProps {
  onScanCreated?: (scanId: string) => void;
}

export default function JobScanForm({ onScanCreated }: JobScanFormProps) {
  const [jobInput, setJobInput] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [context, setContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createJobScan = useMutation(api.jobScans.createJobScan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobInput.trim()) {
      toast.error("Please paste the job posting details");
      return;
    }

    setIsSubmitting(true);

    try {
      const scanId = await createJobScan({
        jobInput: jobInput.trim(),
        jobUrl: jobUrl.trim() || undefined,
        context: context.trim() || undefined,
      });

      toast.success("Job scan created! AI analysis in progress...");

      // Reset form
      setJobInput("");
      setJobUrl("");
      setContext("");

      // Callback to parent component
      if (onScanCreated) {
        onScanCreated(scanId);
      }
    } catch (error) {
      console.error("Failed to create job scan:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create job scan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan a Job Posting</CardTitle>
        <CardDescription>
          Paste a job posting to analyze it for potential red flags and ghost job indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobUrl">Job URL (Optional)</Label>
            <Input
              id="jobUrl"
              type="url"
              placeholder="https://example.com/jobs/123"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobInput">
              Job Posting Details <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="jobInput"
              placeholder="Paste the full job posting text here including job title, description, requirements, company info, etc."
              value={jobInput}
              onChange={(e) => setJobInput(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[200px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Additional Context (Optional)</Label>
            <Textarea
              id="context"
              placeholder="Add any additional context like: Have you seen this job reposted multiple times? Any other suspicious activity?"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[100px]"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
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
