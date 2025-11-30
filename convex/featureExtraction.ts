"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import * as cheerio from "cheerio";
import { createHash } from "crypto";

/**
 * Advanced Feature Extraction for Job Scam Detection
 * Extracts 60+ features across multiple categories
 */

interface ExtractedFeatures {
  // Text-based features
  textFeatures: {
    descriptionLength: number;
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    avgWordLength: number;
    uniqueWordRatio: number;
    allCapsPercentage: number;
    exclamationMarkCount: number;
    questionMarkCount: number;
    hasEmails: boolean;
    hasPhones: boolean;
    hasUrls: boolean;
  };

  // Quality indicators
  qualityFeatures: {
    spellingErrorRate: number;
    grammarQualityScore: number;
    readabilityScore: number;
    hasStructuredSections: boolean;
    hasBulletPoints: boolean;
    hasClearResponsibilities: boolean;
    hasClearQualifications: boolean;
  };

  // Content-based features
  contentFeatures: {
    mentionsSalary: boolean;
    salaryRangeMentioned: boolean;
    hasCompanyWebsite: boolean;
    hasCompanyEmail: boolean;
    usesGenericEmail: boolean;
    mentionsRemote: boolean;
    mentionsFullTime: boolean;
    mentionsPartTime: boolean;
    mentionsContract: boolean;
  };

  // Red flag features
  redFlagFeatures: {
    requestsPayment: boolean;
    requestsSSN: boolean;
    requestsBankInfo: boolean;
    hasTrainingFee: boolean;
    hasMembershipFee: boolean;
    urgencyKeywords: number;
    pressureKeywords: number;
    guaranteesIncome: boolean;
    tooGoodToBeTrue: boolean;
    vagueCommunication: boolean;
    requestsOffPlatform: boolean;
    hasWhatsAppContact: boolean;
    hasTelegramContact: boolean;
  };

  // Metadata
  metadata: {
    jobTitle: string;
    company: string;
    extractedEmails: string[];
    extractedPhones: string[];
    extractedUrls: string[];
    hasJobUrl: boolean;
  };

  // Hash for caching
  contentHash: string;
}

// Helper: Calculate simple spelling error rate
function calculateSpellingErrors(text: string): number {
  // Simple heuristic: words with unusual character patterns
  const words = text.toLowerCase().split(/\s+/);
  let errorCount = 0;

  const commonMisspellings = [
    /guarant[e]?ed/i,
    /recieve/i, // should be receive
    /seperate/i, // should be separate
    /teh/i, // should be the
    /thier/i, // should be their
  ];

  words.forEach((word) => {
    // Check for common misspellings
    if (commonMisspellings.some((pattern) => pattern.test(word))) {
      errorCount++;
    }

    // Check for excessive repeated letters (e.g., "sooooo")
    if (/(.)\1{3,}/.test(word)) {
      errorCount++;
    }
  });

  return words.length > 0 ? errorCount / words.length : 0;
}

// Helper: Calculate readability score (Flesch Reading Ease approximation)
function calculateReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((count, word) => {
    // Simple syllable count: count vowel groups
    const vowels = word.match(/[aeiouy]+/gi);
    return count + (vowels ? vowels.length : 0);
  }, 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Flesch Reading Ease formula
  const score = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

// Helper: Extract emails from text
function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

// Helper: Extract phone numbers
function extractPhones(text: string): string[] {
  const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
  return text.match(phoneRegex) || [];
}

// Helper: Extract URLs
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Helper: Check for generic email domains
function isGenericEmail(email: string): boolean {
  const genericDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "mail.com",
  ];
  const domain = email.split("@")[1]?.toLowerCase();
  return genericDomains.includes(domain);
}

// Helper: Count keyword occurrences
function countKeywords(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = lowerText.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}

export const extractJobFeatures = internalAction({
  args: {
    jobContent: v.string(),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    jobUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ExtractedFeatures> => {
    // Parse HTML content
    const $ = cheerio.load(args.jobContent);

    // Extract text content
    const cleanText = $.text().replace(/\s+/g, " ").trim();

    // Auto-extract job title and company if not provided
    const jobTitle =
      args.jobTitle ||
      $("h1").first().text().trim() ||
      $('[class*="job-title"]').first().text().trim() ||
      "Unknown Position";

    const company =
      args.company ||
      $('[class*="company"]').first().text().trim() ||
      "Unknown Company";

    // Calculate content hash for caching
    const contentHash = createHash("sha256")
      .update(cleanText)
      .digest("hex")
      .substring(0, 16);

    // 1. TEXT FEATURES
    const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));

    const allCapsWords = words.filter((w) => w === w.toUpperCase() && w.length > 1);
    const exclamations = (cleanText.match(/!/g) || []).length;
    const questions = (cleanText.match(/\?/g) || []).length;

    const emails = extractEmails(cleanText);
    const phones = extractPhones(cleanText);
    const urls = extractUrls(cleanText);

    const textFeatures = {
      descriptionLength: cleanText.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgSentenceLength: words.length / Math.max(sentences.length, 1),
      avgWordLength:
        words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1),
      uniqueWordRatio: uniqueWords.size / Math.max(words.length, 1),
      allCapsPercentage: allCapsWords.length / Math.max(words.length, 1),
      exclamationMarkCount: exclamations,
      questionMarkCount: questions,
      hasEmails: emails.length > 0,
      hasPhones: phones.length > 0,
      hasUrls: urls.length > 0,
    };

    // 2. QUALITY FEATURES
    const spellingErrorRate = calculateSpellingErrors(cleanText);
    const readabilityScore = calculateReadability(cleanText);
    const hasBulletPoints = /[•\-*]\s/.test(cleanText) || $("ul, ol").length > 0;
    const hasStructuredSections = $("h2, h3").length > 0;

    const qualityFeatures = {
      spellingErrorRate,
      grammarQualityScore: 100 - spellingErrorRate * 100, // Inverse of spelling errors
      readabilityScore,
      hasStructuredSections,
      hasBulletPoints,
      hasClearResponsibilities: /responsibilities?:/i.test(cleanText),
      hasClearQualifications: /qualifications?:|requirements?:/i.test(cleanText),
    };

    // 3. CONTENT FEATURES
    const contentFeatures = {
      mentionsSalary: /salary|compensation|pay|wage|\$\d+/i.test(cleanText),
      salaryRangeMentioned: /\$\d+[\s-]+\$\d+|(\d+k?[\s-]+\d+k?)/i.test(cleanText),
      hasCompanyWebsite: urls.some((url) => !url.includes("linkedin")),
      hasCompanyEmail: emails.some((e) => !isGenericEmail(e)),
      usesGenericEmail: emails.some((e) => isGenericEmail(e)),
      mentionsRemote: /remote|work from home|wfh/i.test(cleanText),
      mentionsFullTime: /full.time|full-time/i.test(cleanText),
      mentionsPartTime: /part.time|part-time/i.test(cleanText),
      mentionsContract: /contract|freelance|1099/i.test(cleanText),
    };

    // 4. RED FLAG FEATURES
    const urgencyKeywords = [
      "urgent",
      "immediate",
      "now",
      "asap",
      "limited time",
      "act fast",
      "don't miss",
      "hurry",
    ];

    const pressureKeywords = [
      "must decide",
      "today only",
      "limited spots",
      "first come",
      "act now",
    ];

    const redFlagFeatures = {
      requestsPayment: /pay.*fee|invest|purchase|buy.*kit|training.*cost/i.test(
        cleanText
      ),
      requestsSSN: /social security|ssn|tax id/i.test(cleanText),
      requestsBankInfo: /bank account|routing number|direct deposit.*info/i.test(
        cleanText
      ),
      hasTrainingFee: /training.*(?:fee|cost|charge)/i.test(cleanText),
      hasMembershipFee: /membership.*(?:fee|cost)/i.test(cleanText),
      urgencyKeywords: countKeywords(cleanText, urgencyKeywords),
      pressureKeywords: countKeywords(cleanText, pressureKeywords),
      guaranteesIncome: /guarant.*income|earn.*\$\d+.*guaranteed/i.test(cleanText),
      tooGoodToBeTrue:
        /no experience.*\$\d{3,}|easy money|get rich|make.*\$\d{4,}.*week/i.test(
          cleanText
        ),
      vagueCommunication: /will contact you|reach out|get back to you/i.test(
        cleanText
      ) && !emails.length && !phones.length,
      requestsOffPlatform: /whatsapp|telegram|skype|text me|contact.*outside/i.test(
        cleanText
      ),
      hasWhatsAppContact: /whatsapp/i.test(cleanText),
      hasTelegramContact: /telegram/i.test(cleanText),
    };

    // 5. METADATA
    const metadata = {
      jobTitle,
      company,
      extractedEmails: emails,
      extractedPhones: phones,
      extractedUrls: urls,
      hasJobUrl: !!args.jobUrl,
    };

    return {
      textFeatures,
      qualityFeatures,
      contentFeatures,
      redFlagFeatures,
      metadata,
      contentHash,
    };
  },
});

// TODO: Implement caching in future iteration
// For now, extract features on every request
