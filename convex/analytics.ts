import { v } from "convex/values";
import { query } from "./_generated/server";

// Founder emails for access control
const FOUNDER_EMAILS = [
  "isaiah.e.malone@gmail.com",
  "support@jobfiltr.app",
  "hello@jobfiltr.app"
];

// Get comprehensive founder analytics dashboard data
export const getFounderDashboard = query({
  args: { userEmail: v.string() },
  handler: async (ctx, args) => {
    // Verify founder access
    if (!FOUNDER_EMAILS.includes(args.userEmail.toLowerCase())) {
      return null;
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Fetch all data
    const manualScans = await ctx.db.query("scans").collect();
    const urlScans = await ctx.db.query("jobScans").collect();
    const allScans = [...manualScans, ...urlScans];
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const feedback = await ctx.db.query("feedback").collect();
    const documents = await ctx.db.query("documents").collect();
    const communityReviews = await ctx.db.query("communityReviews").collect();
    const users = await ctx.db.query("users").collect();

    // ===== USER METRICS =====
    const uniqueUserIds = new Set([
      ...manualScans.map(s => s.userId),
      ...urlScans.map(s => s.userId),
    ]);
    const totalUsers = uniqueUserIds.size;

    // New users (based on first scan timestamp)
    const userFirstScan: Record<string, number> = {};
    allScans.forEach((scan: any) => {
      const ts = scan.timestamp;
      if (!userFirstScan[scan.userId] || ts < userFirstScan[scan.userId]) {
        userFirstScan[scan.userId] = ts;
      }
    });

    const newUsers24h = Object.values(userFirstScan).filter(ts => ts > oneDayAgo).length;
    const newUsers7d = Object.values(userFirstScan).filter(ts => ts > sevenDaysAgo).length;
    const newUsers30d = Object.values(userFirstScan).filter(ts => ts > thirtyDaysAgo).length;

    // Active users
    const activeUsers24h = new Set(
      allScans.filter((s: any) => s.timestamp > oneDayAgo).map((s: any) => s.userId)
    ).size;
    const activeUsers7d = new Set(
      allScans.filter((s: any) => s.timestamp > sevenDaysAgo).map((s: any) => s.userId)
    ).size;
    const activeUsers30d = new Set(
      allScans.filter((s: any) => s.timestamp > thirtyDaysAgo).map((s: any) => s.userId)
    ).size;

    // ===== ENGAGEMENT METRICS =====
    const totalScans = allScans.length;
    const scans24h = allScans.filter((s: any) => s.timestamp > oneDayAgo).length;
    const scans7d = allScans.filter((s: any) => s.timestamp > sevenDaysAgo).length;
    const avgScansPerUser = totalUsers > 0 ? Math.round(totalScans / totalUsers * 10) / 10 : 0;

    // Scans by source
    const chromeExtScans = manualScans.filter(s => s.context?.includes("Chrome")).length;
    const webAppScans = totalScans - chromeExtScans;

    // Chrome extension downloads tracking
    // Track unique users who have used the Chrome extension (approximates installs)
    const chromeExtUsers = new Set(
      manualScans.filter(s => s.context?.includes("Chrome")).map(s => s.userId)
    ).size;

    // Daily Chrome extension activity (unique users today)
    const chromeExtUsersToday = new Set(
      manualScans
        .filter(s => s.context?.includes("Chrome") && s.timestamp > oneDayAgo)
        .map(s => s.userId)
    ).size;

    // Total downloads (using unique Chrome ext users as proxy, can be manually overridden)
    const chromeExtDownloadsTotal = chromeExtUsers;
    const chromeExtDownloadsToday = chromeExtUsersToday;

    // ===== DETECTION STATS =====
    const scamDetected = allScans.filter((s: any) => s.report?.isScam).length;
    const ghostDetected = allScans.filter((s: any) => s.report?.isGhostJob).length;
    const spamDetected = allScans.filter((s: any) => s.report?.isSpam).length;
    const legitimateJobs = totalScans - scamDetected - ghostDetected - spamDetected;

    const scamRate = totalScans > 0 ? Math.round(scamDetected / totalScans * 100) : 0;
    const ghostRate = totalScans > 0 ? Math.round(ghostDetected / totalScans * 100) : 0;
    const spamRate = totalScans > 0 ? Math.round(spamDetected / totalScans * 100) : 0;

    // ===== SUBSCRIPTION METRICS =====
    const PRO_PRICE = 7.99; // Monthly pro subscription price
    const activeSubscriptions = subscriptions.filter(s => s.status === "active").length;
    const trialingSubscriptions = subscriptions.filter(s => s.status === "trialing").length;
    const canceledSubscriptions = subscriptions.filter(s => s.status === "canceled").length;
    const proUsers = subscriptions.filter(s => s.plan === "pro" && s.status === "active").length;
    const freeUsers = totalUsers - proUsers; // Users without active pro subscription
    const conversionRate = totalUsers > 0 ? Math.round(proUsers / totalUsers * 100) : 0;

    // ===== REVENUE METRICS =====
    const monthlyMRR = Math.round(proUsers * PRO_PRICE * 100) / 100; // MRR in dollars
    const projectedARR = Math.round(monthlyMRR * 12 * 100) / 100; // Projected Annual Revenue

    // ===== MONTHLY MRR CHART DATA (Current Year) =====
    const currentYear = new Date(now).getFullYear();
    const currentMonth = new Date(now).getMonth(); // 0-indexed

    // Calculate MRR for each month based on subscription creation dates
    const monthlyMRRData: { month: string; mrr: number; proUsers: number; newSubs: number; churned: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let month = 0; month <= currentMonth; month++) {
      const monthStart = new Date(currentYear, month, 1).getTime();
      const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59, 999).getTime();

      // Count active pro subscriptions at end of each month
      const activeProAtMonth = subscriptions.filter(s => {
        const createdAt = (s as any).createdAt || (s as any)._creationTime || 0;
        const canceledAt = (s as any).canceledAt || null;

        // Was active during this month
        const wasCreatedBefore = createdAt <= monthEnd;
        const wasNotCanceledYet = !canceledAt || canceledAt > monthEnd;
        const isPro = s.plan === "pro";

        return isPro && wasCreatedBefore && wasNotCanceledYet;
      }).length;

      // New subscriptions this month
      const newSubsThisMonth = subscriptions.filter(s => {
        const createdAt = (s as any).createdAt || (s as any)._creationTime || 0;
        return s.plan === "pro" && createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      // Churned this month
      const churnedThisMonth = subscriptions.filter(s => {
        const canceledAt = (s as any).canceledAt || null;
        return s.plan === "pro" && canceledAt && canceledAt >= monthStart && canceledAt <= monthEnd;
      }).length;

      const monthMRR = Math.round(activeProAtMonth * PRO_PRICE * 100) / 100;

      monthlyMRRData.push({
        month: monthNames[month],
        mrr: monthMRR,
        proUsers: activeProAtMonth,
        newSubs: newSubsThisMonth,
        churned: churnedThisMonth
      });
    }

    // Fill remaining months with projections (null for actual, projected values for future)
    const lastKnownMRR = monthlyMRRData.length > 0 ? monthlyMRRData[monthlyMRRData.length - 1].mrr : 0;
    const lastKnownProUsers = monthlyMRRData.length > 0 ? monthlyMRRData[monthlyMRRData.length - 1].proUsers : 0;

    // Calculate growth rate from available data
    let avgMonthlyGrowthRate = 0;
    if (monthlyMRRData.length >= 2) {
      const growthRates: number[] = [];
      for (let i = 1; i < monthlyMRRData.length; i++) {
        const prevMRR = monthlyMRRData[i - 1].mrr;
        const currMRR = monthlyMRRData[i].mrr;
        if (prevMRR > 0) {
          growthRates.push((currMRR - prevMRR) / prevMRR);
        }
      }
      if (growthRates.length > 0) {
        avgMonthlyGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      }
    }

    // Project remaining months
    const projectedMRRData: { month: string; mrr: number; isProjected: boolean }[] = [];
    for (let month = 0; month < 12; month++) {
      if (month <= currentMonth) {
        projectedMRRData.push({
          month: monthNames[month],
          mrr: monthlyMRRData[month]?.mrr || 0,
          isProjected: false
        });
      } else {
        // Project future months based on growth rate
        const monthsAhead = month - currentMonth;
        const projectedMRR = Math.round(lastKnownMRR * Math.pow(1 + avgMonthlyGrowthRate, monthsAhead) * 100) / 100;
        projectedMRRData.push({
          month: monthNames[month],
          mrr: projectedMRR,
          isProjected: true
        });
      }
    }

    // Calculate projection insights
    const yearEndProjectedMRR = projectedMRRData[11]?.mrr || 0;
    const yearEndProjectedARR = Math.round(yearEndProjectedMRR * 12 * 100) / 100;
    const totalYearRevenue = Math.round(projectedMRRData.reduce((sum, m) => sum + m.mrr, 0) * 100) / 100;
    const avgMRR = Math.round((totalYearRevenue / 12) * 100) / 100;
    const peakMRR = Math.max(...projectedMRRData.map(m => m.mrr));
    const peakMonth = projectedMRRData.find(m => m.mrr === peakMRR)?.month || '';

    const mrrProjection = {
      monthlyData: projectedMRRData,
      detailedMonthlyData: monthlyMRRData,
      currentMRR: monthlyMRR,
      yearEndProjectedMRR,
      yearEndProjectedARR,
      totalYearRevenue,
      avgMRR,
      peakMRR,
      peakMonth,
      avgMonthlyGrowthRate: Math.round(avgMonthlyGrowthRate * 10000) / 100, // as percentage
      monthsWithData: monthlyMRRData.length,
      lastUpdated: now
    };

    // ===== MONTHLY CONVERSION RATE DATA =====
    const monthlyConversionData: { month: string; rate: number; conversions: number; totalUsers: number }[] = [];

    for (let month = 0; month <= currentMonth; month++) {
      const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59, 999).getTime();

      // Get users at end of month
      const usersAtMonth = new Set(
        allScans.filter((s: any) => s.timestamp <= monthEnd).map((s: any) => s.userId)
      ).size;

      // Get pro users at end of month
      const proUsersAtMonth = subscriptions.filter(s => {
        const createdAt = (s as any).createdAt || (s as any)._creationTime || 0;
        const canceledAt = (s as any).canceledAt || null;
        const wasCreatedBefore = createdAt <= monthEnd;
        const wasNotCanceledYet = !canceledAt || canceledAt > monthEnd;
        return s.plan === "pro" && wasCreatedBefore && wasNotCanceledYet;
      }).length;

      const conversionRate = usersAtMonth > 0 ? Math.round(proUsersAtMonth / usersAtMonth * 10000) / 100 : 0;

      monthlyConversionData.push({
        month: monthNames[month],
        rate: conversionRate,
        conversions: proUsersAtMonth,
        totalUsers: usersAtMonth
      });
    }

    // Calculate conversion metrics
    const currentConversionRate = conversionRate;
    const thisMonthConversions = monthlyConversionData.length > 0
      ? monthlyConversionData[monthlyConversionData.length - 1].conversions
      : 0;
    const avgMonthlyConversions = monthlyConversionData.length > 0
      ? Math.round(monthlyConversionData.reduce((sum, m) => sum + m.conversions, 0) / monthlyConversionData.length * 10) / 10
      : 0;

    const conversionRateData = {
      monthlyData: monthlyConversionData,
      currentRate: currentConversionRate,
      thisMonthConversions,
      avgMonthlyConversions
    };

    // ===== DOCUMENT STATS =====
    const totalDocuments = documents.length;
    const resumeCount = documents.filter(d => d.fileType === "resume").length;
    const coverLetterCount = documents.filter(d => d.fileType === "cover_letter").length;
    const portfolioCount = documents.filter(d => d.fileType === "portfolio").length;

    // Average templates per user (documents/templates per user who has uploaded)
    const usersWithDocuments = new Set(documents.map(d => d.userId)).size;
    const avgTemplatesPerUser = usersWithDocuments > 0
      ? Math.round(totalDocuments / usersWithDocuments * 10) / 10
      : 0;

    // ===== FEEDBACK STATS =====
    const totalFeedback = feedback.length;
    const newFeedback = feedback.filter(f => f.status === "new").length;
    const feedbackByType = {
      feedback: feedback.filter(f => f.type === "feedback").length,
      report: feedback.filter(f => f.type === "report").length,
      bug: feedback.filter(f => f.type === "bug").length,
      improvement: feedback.filter(f => f.type === "improvement").length,
    };

    // ===== COMMUNITY STATS =====
    const totalReviews = communityReviews.length;
    const ghostedReports = communityReviews.filter(r => r.gotGhosted).length;
    const realJobsConfirmed = communityReviews.filter(r => r.wasJobReal).length;

    // ===== GROWTH CHART DATA (Last 30 days) =====
    const growthData: { date: string; users: number; scans: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dateKey = dayStart.toISOString().split("T")[0];
      const dayUsers = new Set(
        allScans.filter((s: any) => s.timestamp >= dayStart.getTime() && s.timestamp <= dayEnd.getTime())
          .map((s: any) => s.userId)
      ).size;
      const dayScans = allScans.filter((s: any) =>
        s.timestamp >= dayStart.getTime() && s.timestamp <= dayEnd.getTime()
      ).length;

      growthData.push({ date: dateKey, users: dayUsers, scans: dayScans });
    }

    // ===== DETECTION TYPE CHART =====
    const detectionBreakdown = [
      { type: "Legitimate", count: legitimateJobs, color: "#10B981" },
      { type: "Scam", count: scamDetected, color: "#EF4444" },
      { type: "Ghost Job", count: ghostDetected, color: "#F59E0B" },
      { type: "Spam", count: spamDetected, color: "#8B5CF6" },
    ];

    return {
      // User metrics
      totalUsers,
      newUsers24h,
      newUsers7d,
      newUsers30d,
      activeUsers24h,
      activeUsers7d,
      activeUsers30d,

      // Engagement
      totalScans,
      scans24h,
      scans7d,
      avgScansPerUser,
      chromeExtScans,
      chromeExtDownloadsTotal,
      chromeExtDownloadsToday,
      webAppScans,

      // Detection
      scamDetected,
      ghostDetected,
      spamDetected,
      legitimateJobs,
      scamRate,
      ghostRate,
      spamRate,

      // Subscriptions
      activeSubscriptions,
      trialingSubscriptions,
      canceledSubscriptions,
      proUsers,
      freeUsers,
      conversionRate,

      // Revenue
      monthlyMRR,
      projectedARR,
      mrrProjection,
      conversionRateData,

      // Documents
      totalDocuments,
      resumeCount,
      coverLetterCount,
      portfolioCount,
      avgTemplatesPerUser,

      // Feedback
      totalFeedback,
      newFeedback,
      feedbackByType,

      // Community
      totalReviews,
      ghostedReports,
      realJobsConfirmed,

      // Charts
      growthData,
      detectionBreakdown,

      // Metadata
      lastUpdated: now,
    };
  },
});

// Get training data statistics
export const getTrainingDataStats = query({
  args: {},
  handler: async (ctx) => {
    const allData = await ctx.db.query("trainingData").collect();

    const labeled = allData.filter((d) => d.isLabeled);
    const unlabeled = allData.filter((d) => !d.isLabeled);

    const scamCount = labeled.filter((d) => d.trueScam).length;
    const ghostCount = labeled.filter((d) => d.trueGhostJob).length;
    const spamCount = labeled.filter((d) => d.trueSpam).length;

    // Calculate accuracy metrics
    const scamAccuracy = labeled.filter((d) => d.predictedScam === d.trueScam).length / (labeled.length || 1);
    const ghostAccuracy = labeled.filter((d) => d.predictedGhost === d.trueGhostJob).length / (labeled.length || 1);

    return {
      total: allData.length,
      labeled: labeled.length,
      unlabeled: unlabeled.length,
      scamCount,
      ghostCount,
      spamCount,
      scamAccuracy: Math.round(scamAccuracy * 100),
      ghostAccuracy: Math.round(ghostAccuracy * 100),
      labeledPercentage: Math.round((labeled.length / (allData.length || 1)) * 100),
    };
  },
});

// Get scan statistics
export const getScanStats = query({
  args: {},
  handler: async (ctx) => {
    const manualScans = await ctx.db.query("scans").collect();
    const urlScans = await ctx.db.query("jobScans").collect();

    const totalScans = manualScans.length + urlScans.length;

    // Count by type
    const scamDetected = [
      ...manualScans.filter((s) => s.report.isScam),
      ...urlScans.filter((s) => s.report?.isScam),
    ].length;

    const ghostDetected = [
      ...manualScans.filter((s) => s.report.isGhostJob),
      ...urlScans.filter((s) => s.report?.isGhostJob),
    ].length;

    const spamDetected = [
      ...manualScans.filter((s) => s.report.isSpam),
      ...urlScans.filter((s) => s.report?.isSpam),
    ].length;

    // Get scans by source
    const manualScanCount = manualScans.length;
    const urlScanCount = urlScans.length;
    const chromeExtensionCount = manualScans.filter((s) =>
      s.context?.includes("Chrome Extension")
    ).length;

    return {
      total: totalScans,
      manualScans: manualScanCount,
      urlScans: urlScanCount,
      chromeExtensionScans: chromeExtensionCount,
      scamDetected,
      ghostDetected,
      spamDetected,
      legitimateCount: totalScans - scamDetected - ghostDetected - spamDetected,
    };
  },
});

// Get user activity statistics
export const getUserActivityStats = query({
  args: {},
  handler: async (ctx) => {
    // Get all scans
    const manualScans = await ctx.db.query("scans").collect();
    const urlScans = await ctx.db.query("jobScans").collect();

    // Get unique users
    const uniqueUsers = new Set([
      ...manualScans.map((s) => s.userId),
      ...urlScans.map((s) => s.userId),
    ]);

    // Get subscriptions
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active"
    ).length;

    return {
      totalUsers: uniqueUsers.size,
      activeSubscribers: activeSubscriptions,
      freeUsers: uniqueUsers.size - activeSubscriptions,
    };
  },
});

// Get daily visitor count (scans in last 24 hours)
export const getDailyVisitors = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const manualScans = await ctx.db.query("scans").collect();
    const urlScans = await ctx.db.query("jobScans").collect();

    // Filter for last 24 hours
    const recentManualScans = manualScans.filter(
      (s) => s.timestamp && s.timestamp > twentyFourHoursAgo
    );
    const recentUrlScans = urlScans.filter(
      (s) => s.timestamp && s.timestamp > twentyFourHoursAgo
    );

    // Get unique users who visited today
    const todayUsers = new Set([
      ...recentManualScans.map((s) => s.userId),
      ...recentUrlScans.map((s) => s.userId),
    ]);

    return {
      count: todayUsers.size,
      scansToday: recentManualScans.length + recentUrlScans.length,
    };
  },
});

// Get visitor data for the last 7 days (for chart)
export const getVisitorHistory = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const manualScans = await ctx.db.query("scans").collect();
    const urlScans = await ctx.db.query("jobScans").collect();

    // Create buckets for each day
    const dayBuckets: Record<string, Set<string>> = {};

    for (let i = 0; i < 7; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split("T")[0];
      dayBuckets[dateKey] = new Set();
    }

    // Fill buckets with users
    [...manualScans, ...urlScans].forEach((scan) => {
      const scanTime = (scan as any).timestamp || (scan as any).scannedAt;
      if (!scanTime || scanTime < sevenDaysAgo) return;

      const date = new Date(scanTime);
      const dateKey = date.toISOString().split("T")[0];

      if (dayBuckets[dateKey]) {
        dayBuckets[dateKey].add((scan as any).userId);
      }
    });

    // Convert to array format for chart
    const data = Object.entries(dayBuckets)
      .map(([date, users]) => ({
        date,
        visitors: users.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return data;
  },
});

// Get model performance metrics
export const getModelPerformance = query({
  args: {},
  handler: async (ctx) => {
    const labeled = await ctx.db
      .query("trainingData")
      .filter((q) => q.eq(q.field("isLabeled"), true))
      .collect();

    if (labeled.length === 0) {
      return {
        scamPrecision: 0,
        scamRecall: 0,
        ghostPrecision: 0,
        ghostRecall: 0,
        spamPrecision: 0,
        spamRecall: 0,
        overallAccuracy: 0,
      };
    }

    // Calculate confusion matrix for scams
    const scamTP = labeled.filter((d) => d.predictedScam && d.trueScam).length;
    const scamFP = labeled.filter((d) => d.predictedScam && !d.trueScam).length;
    const scamFN = labeled.filter((d) => !d.predictedScam && d.trueScam).length;

    const scamPrecision = scamTP / (scamTP + scamFP || 1);
    const scamRecall = scamTP / (scamTP + scamFN || 1);

    // Calculate confusion matrix for ghost jobs
    const ghostTP = labeled.filter((d) => d.predictedGhost && d.trueGhostJob).length;
    const ghostFP = labeled.filter((d) => d.predictedGhost && !d.trueGhostJob).length;
    const ghostFN = labeled.filter((d) => !d.predictedGhost && d.trueGhostJob).length;

    const ghostPrecision = ghostTP / (ghostTP + ghostFP || 1);
    const ghostRecall = ghostTP / (ghostTP + ghostFN || 1);

    // Calculate confusion matrix for spam
    const spamTP = labeled.filter((d) => d.predictedSpam && d.trueSpam).length;
    const spamFP = labeled.filter((d) => d.predictedSpam && !d.trueSpam).length;
    const spamFN = labeled.filter((d) => !d.predictedSpam && d.trueSpam).length;

    const spamPrecision = spamTP / (spamTP + spamFP || 1);
    const spamRecall = spamTP / (spamTP + spamFN || 1);

    // Overall accuracy
    const correct = labeled.filter(
      (d) =>
        d.predictedScam === d.trueScam &&
        d.predictedGhost === d.trueGhostJob &&
        (d.predictedSpam === d.trueSpam || d.trueSpam === undefined)
    ).length;

    const overallAccuracy = correct / labeled.length;

    return {
      scamPrecision: Math.round(scamPrecision * 100),
      scamRecall: Math.round(scamRecall * 100),
      ghostPrecision: Math.round(ghostPrecision * 100),
      ghostRecall: Math.round(ghostRecall * 100),
      spamPrecision: Math.round(spamPrecision * 100),
      spamRecall: Math.round(spamRecall * 100),
      overallAccuracy: Math.round(overallAccuracy * 100),
      totalLabeled: labeled.length,
    };
  },
});

// Get active user locations for the globe visualization
export const getActiveUserLocations = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Get recent scans
    const manualScans = await ctx.db.query("scans").collect();
    const urlScans = await ctx.db.query("jobScans").collect();

    // Filter for recent activity
    const recentScans = [...manualScans, ...urlScans].filter((scan: any) => {
      const scanTime = scan.timestamp || scan.scannedAt;
      return scanTime && scanTime > oneDayAgo;
    });

    // Mock location data (in production, this would come from user profiles)
    // Group by user and assign a location
    const locationCounts: Record<string, { lat: number; lng: number; city: string; country: string; count: number }> = {};

    // Sample locations for demonstration
    const sampleLocations = [
      { lat: 40.7128, lng: -74.0060, city: "New York", country: "USA" },
      { lat: 51.5074, lng: -0.1278, city: "London", country: "UK" },
      { lat: 35.6762, lng: 139.6503, city: "Tokyo", country: "Japan" },
      { lat: 48.8566, lng: 2.3522, city: "Paris", country: "France" },
      { lat: -33.8688, lng: 151.2093, city: "Sydney", country: "Australia" },
      { lat: 37.7749, lng: -122.4194, city: "San Francisco", country: "USA" },
      { lat: 55.7558, lng: 37.6173, city: "Moscow", country: "Russia" },
      { lat: 1.3521, lng: 103.8198, city: "Singapore", country: "Singapore" },
      { lat: 52.5200, lng: 13.4050, city: "Berlin", country: "Germany" },
      { lat: 19.4326, lng: -99.1332, city: "Mexico City", country: "Mexico" },
    ];

    // Assign random locations to users (in production, use actual user location data)
    recentScans.forEach((scan: any) => {
      const location = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
      const key = `${location.city}-${location.country}`;

      if (!locationCounts[key]) {
        locationCounts[key] = { ...location, count: 0 };
      }
      locationCounts[key].count++;
    });

    return Object.values(locationCounts);
  },
});
