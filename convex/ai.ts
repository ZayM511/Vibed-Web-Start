"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const analyzeJob = internalAction({
  args: {
    jobTitle: v.string(),
    company: v.string(),
    jobContent: v.string(),
    jobUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const prompt = `You are an expert job listing analyzer helping candidates identify potential scam jobs, ghost jobs, and spam postings.

Analyze the following job listing and identify:
1. Whether it appears to be a SCAM (fraudulent job posting designed to steal information or money)
2. Whether it appears to be a GHOST JOB (legitimate company posting but unlikely to hire, used to appear active or collect resumes)
3. Whether it appears to be SPAM (mass-posted, low-quality, MLM schemes, or recruiter spam)
4. Key red flags and warning signs
5. Overall confidence in your assessment

Job Title: ${args.jobTitle}
Company: ${args.company}
${args.jobUrl ? `Job URL: ${args.jobUrl}` : ""}

Job Description:
${args.jobContent}

Red flags to look for:

SCAM INDICATORS:
- Requests for personal financial information (SSN, bank details) early in process
- Promises of unrealistic pay for minimal work
- Requests to pay for training, equipment, or background checks
- Communication only through email or messaging apps (no company domain)
- Pressure to act quickly or provide information urgently
- Poor grammar and spelling

GHOST JOB INDICATORS:
- Job posting has been up for an extended period without being filled
- Company has many similar job postings across different locations
- Requirements that seem designed to eliminate all candidates
- Vague job descriptions or requirements

SPAM JOB INDICATORS:
- Generic, template-based job descriptions with no customization
- Multiple identical postings from same company/recruiter
- Overly broad "we're always hiring" messaging without specifics
- MLM/pyramid scheme keywords ("downline", "recruit", "unlimited earning potential", "be your own boss")
- Third-party recruiter mass-posting with little company detail
- No specific job requirements or qualifications listed
- Excessive "Apply now!" pressure without substantive information
- Commission-only or multi-level marketing structures
- Focus on recruiting others rather than actual job duties
- Copy-paste descriptions across multiple roles/locations

Provide your analysis in the following JSON format:
{
  "isScam": boolean,
  "isGhostJob": boolean,
  "isSpam": boolean,
  "spamReasoning": "Brief 1-2 sentence explanation if isSpam is true, otherwise null",
  "confidenceScore": number between 0-100,
  "summary": "Brief 2-3 sentence summary of the job",
  "keyQualifications": ["list", "of", "key", "qualifications"],
  "responsibilities": ["list", "of", "key", "responsibilities"],
  "redFlags": [
    {
      "type": "category of red flag (e.g., 'scam_financial', 'ghost_vague', 'spam_mlm', 'spam_mass_posting', 'spam_generic')",
      "description": "specific red flag found",
      "severity": "low" | "medium" | "high"
    }
  ],
  "aiAnalysis": "Detailed explanation of your assessment, including reasoning"
}`;

    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        temperature: 0.3,
      });

      // Parse the JSON response
      const analysisMatch = text.match(/\{[\s\S]*\}/);
      if (!analysisMatch) {
        throw new Error("Failed to parse AI response");
      }

      const analysis = JSON.parse(analysisMatch[0]);

      return {
        jobTitle: args.jobTitle,
        company: args.company,
        location: undefined,
        summary: analysis.summary || "No summary provided",
        keyQualifications: analysis.keyQualifications || [],
        responsibilities: analysis.responsibilities || [],
        redFlags: analysis.redFlags || [],
        confidenceScore: analysis.confidenceScore || 0,
        isScam: analysis.isScam || false,
        isGhostJob: analysis.isGhostJob || false,
        isSpam: analysis.isSpam || false,
        spamReasoning: analysis.spamReasoning || null,
        aiAnalysis: analysis.aiAnalysis || "No detailed analysis available",
      };
    } catch (error) {
      console.error("AI analysis error:", error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
