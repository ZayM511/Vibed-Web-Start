"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { api } from "../_generated/api";

// Define the schema for the AI's structured output
const reportSchema = z.object({
  jobTitle: z.string().describe("The extracted job title."),
  company: z.string().describe("The company offering the job."),
  location: z.string().optional().describe("Job location if available."),
  summary: z.string().describe("A concise summary of the job description."),
  keyQualifications: z.array(z.string()).describe("List of essential qualifications."),
  responsibilities: z.array(z.string()).describe("List of main job responsibilities."),
  confidenceScore: z.number().min(0).max(100).describe("Confidence score (0-100) that this is a legitimate job posting."),
  isScam: z.boolean().optional().describe("Whether this appears to be a scam job posting."),
  isGhostJob: z.boolean().optional().describe("Whether this appears to be a ghost job."),
  isSpam: z.boolean().optional().describe("Whether this appears to be spam (mass-posted, low-quality, MLM scheme)."),
  spamReasoning: z.string().optional().describe("Brief 1-2 sentence explanation if isSpam is true."),
  redFlags: z.array(z.object({
    type: z.string().describe("Category of red flag"),
    description: z.string().describe("Specific red flag found"),
    severity: z.enum(["low", "medium", "high"]).describe("Severity level"),
  })).optional().describe("List of identified red flags"),
  aiAnalysis: z.string().describe("Detailed AI analysis of the job, including pros, cons, and recommendations."),
});

type ScanResult = {
  scanId: any;
  report: z.infer<typeof reportSchema>;
};

export const scrapeAndAnalyzeAction = action({
  args: {
    jobInput: v.string(),
    context: v.optional(v.string()),
    scanMode: v.optional(v.union(v.literal("quick"), v.literal("deep"))),
  },
  handler: async (ctx, { jobInput, context, scanMode = "quick" }): Promise<ScanResult> => {
    // Get user ID if authenticated, allow unauthenticated users to scan
    const userId = (await ctx.auth.getUserIdentity())?.subject;

    // Check if jobInput is a URL, and if so, scrape the content
    let jobDescription = jobInput;
    const isURL = jobInput.trim().match(/^https?:\/\//i);

    if (isURL) {
      try {
        // Get Firecrawl API key from environment
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

        if (firecrawlApiKey) {
          console.log("Scraping job posting from URL:", jobInput);

          // Use Firecrawl API to scrape the job posting
          const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${firecrawlApiKey}`,
            },
            body: JSON.stringify({
              url: jobInput.trim(),
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            if (scrapeData.success && scrapeData.data?.markdown) {
              jobDescription = scrapeData.data.markdown;
              console.log("Successfully scraped job posting content");
            } else {
              console.log("Firecrawl scrape succeeded but no content returned, using URL as fallback");
            }
          } else {
            const errorText = await scrapeResponse.text();
            console.log("Firecrawl scrape failed:", scrapeResponse.status, errorText);
          }
        } else {
          console.log("Firecrawl API key not found, attempting to extract from URL directly");
          // Fallback: Try to extract from URL using simple fetch
          try {
            const response = await fetch(jobInput.trim());
            if (response.ok) {
              const html = await response.text();
              // Extract text content from HTML (basic extraction)
              jobDescription = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              console.log("Extracted content using basic HTML parsing");
            }
          } catch (fetchError) {
            console.log("Direct fetch failed:", fetchError);
          }
        }
      } catch (scrapeError) {
        console.log("Error scraping URL:", scrapeError);
        console.log("Proceeding with URL as text input");
      }
    }

    // Construct the AI prompt with different instructions based on scan mode
    const deepAnalysisInstructions = scanMode === "deep"
      ? `\n\nIMPORTANT - DEEP ANALYSIS MODE:
- Take extra time to thoroughly analyze every aspect of this posting
- Research industry standards and compare compensation, requirements, and responsibilities
- Provide detailed breakdown of company reputation indicators
- Analyze job posting language patterns for manipulation or vagueness
- Cross-reference job requirements with industry norms
- Provide specific, actionable recommendations for the job seeker
- Include detailed pros and cons analysis
- Assess career growth potential and work-life balance indicators
- Your analysis should be comprehensive, premium-quality, and highly detailed`
      : '';

    const prompt = `You are an expert job posting analyzer specializing in identifying scams, ghost jobs, spam postings, and red flags in job postings.

Analyze the following job posting and provide a comprehensive assessment.

${context ? `User Context: ${context}\n\n` : ''}${isURL ? `Original URL: ${jobInput}\n\n` : ''}Job Description:
${jobDescription}
${deepAnalysisInstructions}

Your analysis should:
1. Extract key information (title, company, location, summary, qualifications, responsibilities)
2. Identify if this is a SCAM (fraudulent), GHOST JOB (not actively hiring), or SPAM (mass-posted/MLM/low-quality)
3. List any red flags with severity levels (use types like: 'scam_financial', 'ghost_vague', 'spam_mlm', 'spam_mass_posting', 'spam_generic')
4. Provide a confidence score (0-100) where 100 = highly legitimate, 0 = highly suspicious
5. Give detailed analysis with actionable recommendations about the job posting quality, legitimacy concerns, and any notable aspects

SPAM INDICATORS to check for:
- Generic, template-based descriptions with no customization
- MLM/pyramid scheme keywords ("downline", "recruit", "unlimited earning potential", "be your own boss")
- Third-party recruiter mass-posting
- "We're always hiring" without specifics
- Commission-only structures
- Focus on recruiting others
- No specific requirements listed

If you mark isSpam as true, provide a brief 1-2 sentence explanation in spamReasoning.

Be thorough but fair in your assessment.`;

    try {
      // Use the AI SDK to generate a structured report
      // Deep analysis mode uses higher temperature for more detailed thinking
      const { object: aiReport } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: reportSchema,
        prompt,
        temperature: scanMode === "deep" ? 0.8 : 0.7,
      });

      // Save the result to the database
      // For authenticated users, use their userId; for anonymous users, use test_user_anonymous
      const saveUserId = userId || "test_user_anonymous";
      const scanId = await ctx.runMutation(api.scans.mutations.saveScanResultMutation, {
        userId: saveUserId,
        jobInput,
        context,
        scanMode,
        report: aiReport,
        timestamp: Date.now(),
      });

      // Add to training data for ML pipeline (only for authenticated users)
      if (userId) {
        try {
          await ctx.runMutation(internal.trainingData.addTrainingExampleInternal, {
            userId,
            jobTitle: aiReport.jobTitle,
            company: aiReport.company,
            jobContent: jobInput,
            jobUrl: undefined, // Manual scans don't have URLs
            features: {}, // Features will be extracted during training
            predictedScam: aiReport.isScam || false,
            predictedGhost: aiReport.isGhostJob || false,
            predictedSpam: aiReport.isSpam || false,
            predictedConfidence: aiReport.confidenceScore,
            modelScores: {
              gpt4o_mini_confidence: aiReport.confidenceScore,
              scam_detected: aiReport.isScam,
              ghost_detected: aiReport.isGhostJob,
              spam_detected: aiReport.isSpam,
              spam_reasoning: aiReport.spamReasoning,
              red_flags_count: aiReport.redFlags?.length || 0,
            },
          });
          console.log("✅ Added manual scan to training data:", aiReport.jobTitle);
        } catch (error) {
          console.error("Failed to add manual scan to training data:", error);
          // Don't fail the scan if training data fails
        }
      } else {
        console.log("📊 Anonymous scan saved with test_user_anonymous - will appear in history");
      }

      return { scanId, report: aiReport };
    } catch (error) {
      console.error("AI analysis failed:", error);
      throw new Error(`Failed to analyze job posting: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Action for Chrome Extension scans
export const chromeExtensionScanAction = action({
  args: {
    jobTitle: v.string(),
    company: v.string(),
    location: v.optional(v.string()),
    description: v.string(),
    salary: v.optional(v.string()),
    jobUrl: v.string(),
    mode: v.optional(v.union(v.literal("quick"), v.literal("deep"))),
    useAIExtraction: v.optional(v.boolean()), // New flag for AI-powered extraction
  },
  handler: async (ctx, args): Promise<ScanResult> => {
    const userId = (await ctx.auth.getUserIdentity())?.subject;
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let jobTitle = args.jobTitle;
    let company = args.company;
    let location = args.location;
    let description = args.description;

    // If AI extraction is needed (DOM selectors failed), scrape URL and extract with AI
    if (args.useAIExtraction && args.jobUrl) {
      console.log("Using AI extraction for Chrome extension scan from URL:", args.jobUrl);

      try {
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

        if (firecrawlApiKey) {
          console.log("Scraping job posting from URL using Firecrawl...");

          const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${firecrawlApiKey}`,
            },
            body: JSON.stringify({
              url: args.jobUrl.trim(),
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            if (scrapeData.success && scrapeData.data?.markdown) {
              description = scrapeData.data.markdown;
              console.log("Successfully scraped job posting content");

              // Use AI to extract company name and job title
              const { object: extractedInfo } = await generateObject({
                model: openai("gpt-4o-mini"),
                schema: z.object({
                  company: z.string().describe("The company name extracted from the job posting"),
                  jobTitle: z.string().describe("The job title extracted from the posting"),
                  location: z.string().optional().describe("The job location if available"),
                }),
                prompt: `Extract the company name, job title, and location from this job posting:\n\n${description}`,
                temperature: 0,
              });

              jobTitle = extractedInfo.jobTitle;
              company = extractedInfo.company;
              if (extractedInfo.location) {
                location = extractedInfo.location;
              }

              console.log(`AI extracted - Company: ${company}, Title: ${jobTitle}`);
            }
          }
        } else {
          console.log("Firecrawl API key not found, using description as-is");
        }
      } catch (scrapeError) {
        console.log("Error scraping URL or extracting with AI:", scrapeError);
        // Continue with whatever data we have
      }
    }

    // Construct job input from extracted data
    const jobInput = `
Job Title: ${jobTitle}
Company: ${company}
${location ? `Location: ${location}` : ''}
${args.salary ? `Salary: ${args.salary}` : ''}
URL: ${args.jobUrl}

Job Description:
${description}
    `.trim();

    // Construct the AI prompt
    const prompt = `You are an expert job posting analyzer specializing in identifying scams, ghost jobs, spam postings, and red flags in job postings.

Analyze the following job posting and provide a comprehensive assessment.

Job Details:
${jobInput}

Your analysis should:
1. Extract key information (title, company, location, summary, qualifications, responsibilities)
2. Identify if this is a SCAM (fraudulent), GHOST JOB (not actively hiring), or SPAM (mass-posted/MLM/low-quality)
3. List any red flags with severity levels (use types like: 'scam_financial', 'ghost_vague', 'spam_mlm', 'spam_mass_posting', 'spam_generic')
4. Provide a confidence score (0-100) where 100 = highly legitimate, 0 = highly suspicious
5. Give detailed analysis with actionable recommendations about the job posting quality, legitimacy concerns, and any notable aspects

SPAM INDICATORS to check for:
- Generic, template-based descriptions with no customization
- MLM/pyramid scheme keywords ("downline", "recruit", "unlimited earning potential", "be your own boss")
- Third-party recruiter mass-posting
- "We're always hiring" without specifics
- Commission-only structures
- Focus on recruiting others
- No specific requirements listed

If you mark isSpam as true, provide a brief 1-2 sentence explanation in spamReasoning.

Be thorough but fair in your assessment.`;

    try {
      // Use the AI SDK to generate a structured report
      const { object: aiReport } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: reportSchema,
        prompt,
        temperature: 0.7,
      });

      // Save the result to the database via a mutation
      const scanId: any = await ctx.runMutation(api.scans.mutations.saveScanResultMutation, {
        userId,
        jobInput,
        context: `Chrome Extension Scan - ${args.mode || 'quick'} mode`,
        report: aiReport,
        timestamp: Date.now(),
      });

      // Add to training data for ML pipeline
      try {
        await ctx.runMutation(internal.trainingData.addTrainingExampleInternal, {
          userId,
          jobTitle: aiReport.jobTitle,
          company: aiReport.company,
          jobContent: jobInput,
          jobUrl: args.jobUrl,
          features: {
            source: "chrome_extension",
            scan_mode: args.mode || "quick",
          },
          predictedScam: aiReport.isScam || false,
          predictedGhost: aiReport.isGhostJob || false,
          predictedSpam: aiReport.isSpam || false,
          predictedConfidence: aiReport.confidenceScore,
          modelScores: {
            gpt4o_mini_confidence: aiReport.confidenceScore,
            scam_detected: aiReport.isScam,
            ghost_detected: aiReport.isGhostJob,
            spam_detected: aiReport.isSpam,
            spam_reasoning: aiReport.spamReasoning,
            red_flags_count: aiReport.redFlags?.length || 0,
            source: "chrome_extension",
          },
        });
        console.log("✅ Added Chrome extension scan to training data:", aiReport.jobTitle);
      } catch (error) {
        console.error("Failed to add Chrome extension scan to training data:", error);
        // Don't fail the scan if training data fails
      }

      return { scanId, report: aiReport };
    } catch (error) {
      console.error("AI analysis failed:", error);
      throw new Error(`Failed to analyze job posting: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

// Temporarily disabled due to TypeScript compilation issues
// export const requestDeeperReportAction = action({
//   args: {
//     scanId: v.id("scans"),
//     userEmail: v.string(),
//   },
//   handler: async (ctx, { scanId, userEmail }) => {
//     const userId = (await ctx.auth.getUserIdentity())?.subject;
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     const scan = await ctx.runQuery(api.scans.queries.getScanResultByIdQuery, { scanId });

//     if (!scan || scan.userId !== userId) {
//       throw new Error("Scan not found or unauthorized.");
//     }

//     // TODO: Implement email service integration (e.g., SendGrid, Resend)
//     // For now, we'll just log the request
//     console.log(`Deeper report requested for scan ${scanId} to ${userEmail}`);
//     console.log("Email service integration needed - add API key and configure email template");

//     return {
//       success: true,
//       message: `Deeper report will be sent to ${userEmail}. Email service integration pending.`
//     };
//   },
// });
