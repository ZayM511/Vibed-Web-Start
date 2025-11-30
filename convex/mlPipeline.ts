"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import * as cheerio from "cheerio";

/**
 * Advanced ML Pipeline for Job Scam Detection
 * Integrates feature extraction, ensemble ML models, and GPT-4o analysis
 */

// ML Service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// Main scanning action with ML pipeline
export const scanJobWithML = action({
  args: {
    jobContent: v.string(),
    jobUrl: v.optional(v.string()),
    userId: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    console.log("Starting ML-powered job scan...");

    try {
      // Step 1: Extract job metadata
      const $ = cheerio.load(args.jobContent);
      let jobTitle =
        $("h1").first().text().trim() ||
        $('[class*="job-title"]').first().text().trim() ||
        "Job Title Not Found";

      let company =
        $('[class*="company"]').first().text().trim() ||
        "Company Not Found";

      const cleanText = $.text().replace(/\s+/g, " ").trim();

      // Fallback extraction from plain text
      if (jobTitle === "Job Title Not Found" || company === "Company Not Found") {
        const lines = args.jobContent.split("\n").filter((line) => line.trim());
        if (lines.length > 0 && jobTitle === "Job Title Not Found") {
          jobTitle = lines[0].trim();
        }
        if (lines.length > 1 && company === "Company Not Found") {
          company = lines[1].trim();
        }
      }

      console.log(`Analyzing job: "${jobTitle}" at ${company}`);

      // Step 2: Extract features using internal action
      console.log("Extracting features...");
      const features: any = await ctx.runAction(internal.featureExtraction.extractJobFeatures, {
        jobContent: args.jobContent,
        jobTitle,
        company,
        jobUrl: args.jobUrl,
      });

      console.log("Features extracted successfully");

      // Step 3: Call ML service for ensemble prediction
      console.log("Calling ML service...");
      let mlPrediction: any;

      try {
        const mlResponse: any = await fetch(`${ML_SERVICE_URL}/predict`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            features,
            jobContent: cleanText,
          }),
        });

        if (!mlResponse.ok) {
          throw new Error(`ML service error: ${mlResponse.statusText}`);
        }

        mlPrediction = await mlResponse.json();
        console.log("ML prediction received:", mlPrediction);
      } catch (mlError) {
        console.warn("ML service unavailable, using fallback:", mlError);

        // Fallback to rule-based scoring if ML service is down
        mlPrediction = generateFallbackPrediction(features);
      }

      // Step 4: Run GPT-4o analysis in parallel for rich insights
      console.log("Running LLM analysis...");
      const llmAnalysis: any = await ctx.runAction(internal.ai.analyzeJob, {
        jobTitle,
        company,
        jobContent: cleanText,
        jobUrl: args.jobUrl,
      });

      console.log("LLM analysis complete");

      // Step 5: Fuse ML and LLM results
      const fusedResult = fuseResults(mlPrediction, llmAnalysis, features);

      console.log("Scan complete - Final confidence:", fusedResult.confidenceScore);

      // Step 6: Store in training data for continuous learning
      await ctx.runMutation(internal.trainingData.addTrainingExampleInternal, {
        userId: args.userId,
        jobTitle,
        company,
        jobContent: args.jobContent,
        jobUrl: args.jobUrl,
        features,
        predictedScam: fusedResult.isScam,
        predictedGhost: fusedResult.isGhostJob,
        predictedConfidence: fusedResult.confidenceScore,
        modelScores: mlPrediction.modelScores,
      });

      // Return the complete scan result
      return {
        report: fusedResult,
        jobInput: args.jobContent,
        jobUrl: args.jobUrl,
        mlMetrics: {
          inferenceTime: mlPrediction.inferenceTime,
          modelVersion: mlPrediction.modelVersion,
          modelScores: mlPrediction.modelScores,
        },
      };
    } catch (error) {
      console.error("ML pipeline error:", error);

      // Ultimate fallback: use GPT-4o only
      console.log("Falling back to GPT-4o only...");
      const $ = cheerio.load(args.jobContent);
      const cleanText = $.text().replace(/\s+/g, " ").trim();

      let jobTitle = $("h1").first().text().trim() || "Unknown Position";
      let company = $('[class*="company"]').first().text().trim() || "Unknown Company";

      try {
        const llmAnalysis = await ctx.runAction(internal.ai.analyzeJob, {
          jobTitle,
          company,
          jobContent: cleanText,
          jobUrl: args.jobUrl,
        });

        // Store in training data even if ML failed
        await ctx.runMutation(internal.trainingData.addTrainingExampleInternal, {
          userId: args.userId,
          jobTitle,
          company,
          jobContent: args.jobContent,
          jobUrl: args.jobUrl,
          features: {},
          predictedScam: llmAnalysis.isScam,
          predictedGhost: llmAnalysis.isGhostJob,
          predictedConfidence: llmAnalysis.confidenceScore,
          modelScores: {},
        });

        return {
          report: llmAnalysis,
          jobInput: args.jobContent,
          jobUrl: args.jobUrl,
          mlMetrics: {
            inferenceTime: 0,
            modelVersion: "gpt4o-fallback",
            modelScores: null,
          },
        };
      } catch (llmError) {
        console.error("LLM fallback also failed:", llmError);

        // FINAL fallback: Return dummy data but still store for labeling
        console.log("Using rule-based fallback only...");

        const dummyReport = {
          jobTitle,
          company,
          location: "Unknown",
          summary: cleanText.substring(0, 200) + "...",
          keyQualifications: [],
          responsibilities: [],
          redFlags: [],
          confidenceScore: 50, // Neutral - needs human labeling
          isScam: false,
          isGhostJob: false,
          aiAnalysis: "Analysis unavailable - requires manual review",
        };

        // Store in training data for manual labeling
        await ctx.runMutation(internal.trainingData.addTrainingExampleInternal, {
          userId: args.userId,
          jobTitle,
          company,
          jobContent: args.jobContent,
          jobUrl: args.jobUrl,
          features: {},
          predictedScam: false,
          predictedGhost: false,
          predictedConfidence: 50,
          modelScores: {},
        });

        return {
          report: dummyReport,
          jobInput: args.jobContent,
          jobUrl: args.jobUrl,
          mlMetrics: {
            inferenceTime: 0,
            modelVersion: "rule-based-fallback",
            modelScores: null,
          },
        };
      }
    }
  },
});

/**
 * Fuse ML model predictions with LLM analysis
 */
function fuseResults(mlPrediction: any, llmAnalysis: any, features: any) {
  // Ensemble weights
  const ML_WEIGHT = 0.70; // ML models carry more weight
  const LLM_WEIGHT = 0.30; // LLM provides rich context

  // Calculate final scam probability
  const mlScamScore = mlPrediction.scamProbability;
  const llmScamScore = llmAnalysis.isScam ? 0.85 : 0.15; // Binary to probability

  const finalScamProb = mlScamScore * ML_WEIGHT + llmScamScore * LLM_WEIGHT;

  // Calculate final ghost job probability
  const mlGhostScore = mlPrediction.ghostProbability;
  const llmGhostScore = llmAnalysis.isGhostJob ? 0.80 : 0.20;

  const finalGhostProb = mlGhostScore * ML_WEIGHT + llmGhostScore * LLM_WEIGHT;

  // Determine final classifications
  const isScam = finalScamProb > 0.50;
  const isGhostJob = finalGhostProb > 0.50;

  // Confidence based on model agreement
  const mlLlmAgreement =
    (mlPrediction.scamProbability > 0.5 === llmAnalysis.isScam) ? 1.0 : 0.5;

  const finalConfidence = Math.min(
    100,
    mlPrediction.confidence * 100 * 0.7 + llmAnalysis.confidenceScore * 0.3
  ) * mlLlmAgreement;

  // Merge red flags from both sources
  const combinedRedFlags = [
    ...llmAnalysis.redFlags,
    ...extractMLRedFlags(features, mlPrediction),
  ];

  // Deduplicate red flags
  const uniqueRedFlags = Array.from(
    new Map(combinedRedFlags.map((flag) => [flag.type + flag.description, flag])).values()
  );

  return {
    jobTitle: llmAnalysis.jobTitle,
    company: llmAnalysis.company,
    location: llmAnalysis.location,
    summary: llmAnalysis.summary,
    keyQualifications: llmAnalysis.keyQualifications,
    responsibilities: llmAnalysis.responsibilities,
    redFlags: uniqueRedFlags,
    confidenceScore: Math.round(finalConfidence),
    isScam,
    isGhostJob,
    aiAnalysis: generateEnhancedAnalysis(
      llmAnalysis.aiAnalysis,
      mlPrediction,
      finalScamProb,
      finalGhostProb
    ),
  };
}

/**
 * Extract red flags from ML features
 */
function extractMLRedFlags(features: any, mlPrediction: any): any[] {
  const redFlags: any[] = [];
  const rf = features.redFlagFeatures;

  if (rf.requestsPayment) {
    redFlags.push({
      type: "Financial Request",
      description: "Job posting requests payment or investment",
      severity: "high" as const,
    });
  }

  if (rf.requestsSSN) {
    redFlags.push({
      type: "Privacy Violation",
      description: "Requests Social Security Number early in process",
      severity: "high" as const,
    });
  }

  if (rf.guaranteesIncome) {
    redFlags.push({
      type: "Unrealistic Promise",
      description: "Guarantees specific income amounts",
      severity: "high" as const,
    });
  }

  if (rf.urgencyKeywords > 3) {
    redFlags.push({
      type: "Pressure Tactic",
      description: `Heavy use of urgency language (${rf.urgencyKeywords} instances)`,
      severity: "medium" as const,
    });
  }

  if (features.contentFeatures.usesGenericEmail) {
    redFlags.push({
      type: "Unprofessional Contact",
      description: "Uses generic email (Gmail, Yahoo, etc.) instead of company domain",
      severity: "medium" as const,
    });
  }

  if (features.qualityFeatures.spellingErrorRate > 0.05) {
    redFlags.push({
      type: "Quality Issue",
      description: "High spelling/grammar error rate suggests unprofessionalism",
      severity: "low" as const,
    });
  }

  return redFlags;
}

/**
 * Generate enhanced analysis combining ML insights with LLM explanation
 */
function generateEnhancedAnalysis(
  llmAnalysis: string,
  mlPrediction: any,
  scamProb: number,
  ghostProb: number
): string {
  const mlInsights = `

**Advanced ML Analysis:**
- Scam Risk: ${(scamProb * 100).toFixed(1)}% (${scamProb > 0.7 ? "HIGH" : scamProb > 0.4 ? "MODERATE" : "LOW"})
- Ghost Job Risk: ${(ghostProb * 100).toFixed(1)}% (${ghostProb > 0.6 ? "HIGH" : ghostProb > 0.3 ? "MODERATE" : "LOW"})
- Model Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%
- Analysis Version: ${mlPrediction.modelVersion}

**Model Ensemble Breakdown:**
- Transformer Model (BERT): ${(mlPrediction.modelScores.transformer * 100).toFixed(1)}%
- Gradient Boosting (XGBoost): ${(mlPrediction.modelScores.xgboost * 100).toFixed(1)}%
- Anomaly Detection: ${(mlPrediction.modelScores.anomaly * 100).toFixed(1)}%

`;

  return llmAnalysis + mlInsights;
}

/**
 * Fallback prediction using rule-based system
 */
function generateFallbackPrediction(features: any) {
  const rf = features.redFlagFeatures;

  // Count severe red flags
  const severeCount = [
    rf.requestsPayment,
    rf.requestsSSN,
    rf.requestsBankInfo,
    rf.guaranteesIncome,
    rf.tooGoodToBeTrue,
  ].filter(Boolean).length;

  const scamProbability = Math.min(0.95, severeCount * 0.25 + (rf.urgencyKeywords || 0) * 0.05);

  const ghostProbability = 0.30; // Conservative default

  return {
    scamProbability,
    ghostProbability,
    confidence: 0.60, // Lower confidence for fallback
    modelScores: {
      transformer: scamProbability,
      xgboost: scamProbability,
      anomaly: scamProbability,
    },
    featureImportance: [],
    inferenceTime: 0,
    modelVersion: "fallback-rules-v1",
  };
}
