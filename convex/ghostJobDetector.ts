"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Main action to detect ghost jobs using AI analysis
 * This is an internal action that performs the AI analysis
 */
export const detectGhostJob = internalAction({
  args: {
    jobScanId: v.id("jobScans"),
    jobInput: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Get OpenAI API key from environment
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set");
      }

      // Check if jobInput is a URL, and if so, scrape the content
      let jobPostingContent = args.jobInput;
      const isURL = args.jobInput.trim().match(/^https?:\/\//i);

      if (isURL) {
        try {
          // Get Firecrawl API key from environment
          const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

          if (firecrawlApiKey) {
            console.log("Scraping job posting from URL:", args.jobInput);

            // Use Firecrawl API to scrape the job posting
            const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${firecrawlApiKey}`,
              },
              body: JSON.stringify({
                url: args.jobInput.trim(),
                formats: ["markdown"],
                onlyMainContent: true,
              }),
            });

            if (scrapeResponse.ok) {
              const scrapeData = await scrapeResponse.json();
              if (scrapeData.success && scrapeData.data?.markdown) {
                jobPostingContent = scrapeData.data.markdown;
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
              const response = await fetch(args.jobInput.trim());
              if (response.ok) {
                const html = await response.text();
                // Extract text content from HTML (basic extraction)
                jobPostingContent = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
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

      // First, extract company name and job title for web research
      const companyExtractionSchema = z.object({
        company: z.string().describe("The company name extracted from the job posting"),
        jobTitle: z.string().describe("The job title extracted from the posting"),
      });

      const { object: extractedInfo } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: companyExtractionSchema,
        prompt: `Extract the company name and job title from this job posting:\n\n${jobPostingContent}`,
        temperature: 0,
      });

      // Perform comprehensive web research for company verification
      let webResearchResults = "";
      let companyWebsiteInfo = "";
      let duplicatePostingsInfo = "";
      let careersPagesInfo = "";
      let reputationInfo = "";

      try {
        // Use Tavily API for comprehensive web search
        const tavilyApiKey = process.env.TAVILY_API_KEY;

        if (tavilyApiKey) {
          // Search 1: Company official website and legitimacy
          const companySearchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: `${extractedInfo.company} official website company information headquarters`,
              search_depth: "advanced",
              max_results: 5,
            }),
          });

          if (companySearchResponse.ok) {
            const companyData = await companySearchResponse.json();
            const companyResults = companyData.results || [];
            companyWebsiteInfo = companyResults.length > 0
              ? `Company Website Found: ${companyResults.map((r: any) => `\n- ${r.title}: ${r.url} (${r.content?.substring(0, 150)}...)`).join("")}`
              : "No official company website found";
          }

          // Search 2: Careers page and job posting verification
          const careersSearchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: `${extractedInfo.company} careers page jobs "${extractedInfo.jobTitle}"`,
              search_depth: "advanced",
              max_results: 5,
            }),
          });

          if (careersSearchResponse.ok) {
            const careersData = await careersSearchResponse.json();
            const careersResults = careersData.results || [];
            careersPagesInfo = careersResults.length > 0
              ? `Careers Pages Found: ${careersResults.map((r: any) => `\n- ${r.title}: ${r.url}`).join("")}`
              : "No official careers page found for this company";
          }

          // Search 3: Duplicate job postings across platforms
          const duplicateSearchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: `"${extractedInfo.jobTitle}" "${extractedInfo.company}" site:linkedin.com OR site:indeed.com OR site:glassdoor.com`,
              search_depth: "basic",
              max_results: 10,
            }),
          });

          if (duplicateSearchResponse.ok) {
            const duplicateData = await duplicateSearchResponse.json();
            const duplicateResults = duplicateData.results || [];
            duplicatePostingsInfo = duplicateResults.length > 0
              ? `Duplicate Postings Found (${duplicateResults.length} matches): ${duplicateResults.slice(0, 5).map((r: any) => `\n- ${r.title} on ${new URL(r.url).hostname}`).join("")}`
              : "No duplicate postings found on major job boards";
          }

          // Search 4: Company reputation and reviews
          const reputationSearchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: `${extractedInfo.company} reviews scam complaints site:glassdoor.com OR site:trustpilot.com OR site:bbb.org`,
              search_depth: "basic",
              max_results: 5,
            }),
          });

          if (reputationSearchResponse.ok) {
            const reputationData = await reputationSearchResponse.json();
            const reputationResults = reputationData.results || [];
            reputationInfo = reputationResults.length > 0
              ? `Company Reputation Sources: ${reputationResults.map((r: any) => `\n- ${r.title}: ${r.url}`).join("")}`
              : "No reputation information found on review sites";
          }

          webResearchResults = `
=== WEB RESEARCH RESULTS ===

${companyWebsiteInfo}

${careersPagesInfo}

${duplicatePostingsInfo}

${reputationInfo}

ANALYSIS NOTES:
- Multiple duplicate postings may indicate a ghost job (company not actively hiring)
- Lack of company website or careers page is a significant red flag
- Long posting duration suggests the position may not be actively filled
- Cross-reference with official company careers page to verify legitimacy
          `.trim();
        } else {
          // Fallback: Basic web searches without Tavily
          console.log("Tavily API key not found, using basic search");
          webResearchResults = `
Web Research Conducted (Limited):
- Company searched: ${extractedInfo.company}
- Job title searched: ${extractedInfo.jobTitle}
- NOTE: Full web verification unavailable. Install Tavily API for comprehensive company verification.
- Analysis based primarily on job posting content.
          `.trim();
        }
      } catch (error) {
        console.log("Web search failed, proceeding with content-only analysis:", error);
        webResearchResults = `Web research unavailable due to error: ${error instanceof Error ? error.message : "Unknown error"}
Analysis based on job posting content only.`;
      }

      // Define schema for structured output
      const analysisSchema = z.object({
        jobTitle: z.string().describe("The extracted job title from the posting"),
        company: z.string().describe("The extracted company name"),
        location: z.string().optional().describe("The job location if available"),
        summary: z.string().describe("A brief 2-3 sentence summary of the job posting"),
        keyQualifications: z.array(z.string()).describe("List of key qualifications required"),
        responsibilities: z.array(z.string()).describe("List of main job responsibilities"),
        redFlags: z.array(z.object({
          type: z.string().describe("Category of red flag (e.g., 'scam_financial', 'ghost_vague', 'spam_mlm', 'spam_mass_posting', 'spam_generic')"),
          description: z.string().describe("Specific description of this red flag"),
          severity: z.enum(["low", "medium", "high"]).describe("Severity level of the red flag"),
        })).describe("List of identified red flags"),
        confidenceScore: z.number().min(0).max(100).describe("Confidence score 0-100 where 100 is definitely a ghost job/scam"),
        isScam: z.boolean().describe("Whether this appears to be a scam job posting"),
        isGhostJob: z.boolean().describe("Whether this appears to be a ghost job (posted without intent to hire)"),
        isSpam: z.boolean().describe("Whether this appears to be spam (mass-posted, low-quality, MLM scheme, or recruiter spam)"),
        spamReasoning: z.string().optional().describe("Brief 1-2 sentence explanation if isSpam is true"),
        aiAnalysis: z.string().describe("Detailed analysis explaining the assessment with specific examples"),
      });

      // Construct the prompt for AI analysis with web research context
      const prompt = `You are an expert job market analyst specializing in detecting "ghost jobs", scam job postings, and spam listings.

Analyze the following job posting and provide a comprehensive assessment:

Job Posting:
${jobPostingContent}

${args.context ? `Additional Context:\n${args.context}` : ""}

${isURL ? `Original URL: ${args.jobInput}\n` : ""}

Web Research Results:
${webResearchResults}

IMPORTANT: Use the web research results above to inform your analysis. Consider whether:
- The company has a verifiable web presence and official careers page
- The job posting appears on the company's official website
- There are multiple duplicate postings suggesting it may be a ghost job or spam
- The posting duration indicates it's been open unusually long

Consider these common red flags:

SCAM INDICATORS:
1. Requests for personal financial information (SSN, bank details) early in process
2. Promises of unrealistic pay for minimal work
3. Requests to pay for training, equipment, or background checks
4. Communication only through email or messaging apps (no company domain)
5. Pressure to act quickly or provide information urgently
6. Poor grammar and spelling

GHOST JOB INDICATORS:
7. Job posting has been up for an unusually long time (reposted repeatedly)
8. Company has many similar job postings across different locations
9. Requirements that seem designed to eliminate all candidates
10. Vague job descriptions or responsibilities
11. Company information that's hard to verify or doesn't exist

SPAM JOB INDICATORS:
12. Generic, template-based job descriptions with no customization
13. Multiple identical postings from same company/recruiter (check web research results)
14. Overly broad "we're always hiring" messaging without specifics
15. MLM/pyramid scheme keywords ("downline", "recruit", "unlimited earning potential", "be your own boss")
16. Third-party recruiter mass-posting with little company detail
17. No specific job requirements or qualifications listed
18. Excessive "Apply now!" pressure without substantive information
19. Commission-only or multi-level marketing structures
20. Focus on recruiting others rather than actual job duties
21. Copy-paste descriptions across multiple roles/locations

Be specific and reference concrete details from the job posting in your analysis. If you mark isSpam as true, provide a brief 1-2 sentence explanation in spamReasoning.`;

      // Call OpenAI API using structured output (more reliable than text parsing)
      const { object: analysisResult } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: analysisSchema,
        prompt: prompt,
        temperature: 0.3,
      });

      // Validate and normalize the analysis result
      const report = {
        jobTitle: analysisResult.jobTitle || "Unknown Position",
        company: analysisResult.company || "Unknown Company",
        location: analysisResult.location || undefined,
        summary: analysisResult.summary || "No summary available",
        keyQualifications: Array.isArray(analysisResult.keyQualifications)
          ? analysisResult.keyQualifications
          : [],
        responsibilities: Array.isArray(analysisResult.responsibilities)
          ? analysisResult.responsibilities
          : [],
        redFlags: Array.isArray(analysisResult.redFlags)
          ? analysisResult.redFlags.map((flag: any) => ({
              type: flag.type || "unknown",
              description: flag.description || "",
              severity: ["low", "medium", "high"].includes(flag.severity)
                ? flag.severity
                : "medium",
            }))
          : [],
        confidenceScore:
          typeof analysisResult.confidenceScore === "number"
            ? analysisResult.confidenceScore
            : 0,
        isScam: Boolean(analysisResult.isScam),
        isGhostJob: Boolean(analysisResult.isGhostJob),
        isSpam: Boolean(analysisResult.isSpam),
        spamReasoning: analysisResult.spamReasoning || undefined,
        aiAnalysis: analysisResult.aiAnalysis || "No analysis available",
        webResearch: {
          companyWebsiteFound: companyWebsiteInfo.includes("Company Website Found:"),
          careersPageFound: careersPagesInfo.includes("Careers Pages Found:"),
          duplicatePostingsCount: duplicatePostingsInfo.match(/\d+(?= matches)/)?.[0]
            ? parseInt(duplicatePostingsInfo.match(/\d+(?= matches)/)?.[0] || "0")
            : 0,
          reputationSources: reputationInfo.includes("Company Reputation Sources:")
            ? reputationInfo.split('\n').filter(line => line.includes('http')).map(line => line.trim())
            : [],
          verifiedOnOfficialSite: careersPagesInfo.toLowerCase().includes(extractedInfo.company.toLowerCase()),
        },
      };

      // Update the job scan with the result
      await ctx.runMutation(internal.ghostJobMutations.updateJobScanReport, {
        jobScanId: args.jobScanId,
        report: report,
      });

      // Also add to training data for ML model improvement
      // Get the scan to retrieve userId and jobUrl
      const jobScan = await ctx.runQuery(internal.ghostJobMutations.getJobScanInternal, {
        jobScanId: args.jobScanId,
      });

      if (jobScan) {
        await ctx.runMutation(internal.trainingData.addTrainingExampleInternal, {
          userId: jobScan.userId,
          jobTitle: report.jobTitle,
          company: report.company,
          jobContent: args.jobInput,
          jobUrl: jobScan.jobUrl,
          features: {}, // Features will be extracted during training
          predictedScam: report.isScam,
          predictedGhost: report.isGhostJob,
          predictedSpam: report.isSpam,
          predictedConfidence: report.confidenceScore,
          modelScores: {
            gpt4o_confidence: report.confidenceScore,
            spam_detected: report.isSpam,
            spam_reasoning: report.spamReasoning,
            web_research_score: {
              website_found: report.webResearch?.companyWebsiteFound,
              careers_found: report.webResearch?.careersPageFound,
              verified: report.webResearch?.verifiedOnOfficialSite,
              duplicate_count: report.webResearch?.duplicatePostingsCount,
            },
          },
        });

        console.log("✅ Added job scan to training data:", report.jobTitle);
      }

      return report;
    } catch (error) {
      console.error("Error in detectGhostJob:", error);

      // Update the job scan with error status
      await ctx.runMutation(internal.ghostJobMutations.updateJobScanReport, {
        jobScanId: args.jobScanId,
        report: {
          jobTitle: "Error",
          company: "Error",
          location: undefined,
          summary: "Analysis failed",
          keyQualifications: [],
          responsibilities: [],
          redFlags: [
            {
              type: "error",
              description: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              severity: "high" as const,
            },
          ],
          confidenceScore: 0,
          isScam: false,
          isGhostJob: false,
          aiAnalysis: `Error during analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      });

      throw error;
    }
  },
});
