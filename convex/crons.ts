import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Aggregate yesterday's raw pageViews into dailyPageViewStats every day at midnight UTC
crons.cron(
  "aggregate daily page view stats",
  "0 0 * * *",
  internal.pageViews.aggregateDailyStats,
  {}
);

export default crons;
