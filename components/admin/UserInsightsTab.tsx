"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Users,
  Crown,
  Zap,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Download,
  UserPlus,
  MapPin,
  Target,
  Eye,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedStatCard } from "@/components/admin/AnimatedStatCard";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

interface ClerkUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number | null;
  lastActiveAt: number | null;
}

const PIE_COLORS = ["#06b6d4", "#f59e0b"];
const STATUS_COLORS = ["#f59e0b", "#06b6d4", "#8b5cf6", "#22c55e"];
const SOURCE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4"];

export function UserInsightsTab() {
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  // Founder dashboard data from Convex
  const founderData = useQuery(api.analytics.getFounderDashboard, { userEmail });

  // Waitlist analytics data
  const waitlistAnalytics = useQuery(api.waitlist.getWaitlistAnalytics);

  // Page view traffic data
  const pageViewStats = useQuery(api.pageViews.getDailyPageViewStats, { userEmail });

  // Clerk users fetched from API route
  const [clerkUsers, setClerkUsers] = useState<ClerkUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setClerkUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setUsersLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Subscription data from founder dashboard
  const proUsers = founderData?.proUsers ?? 0;
  const freeUsers = founderData?.freeUsers ?? 0;
  const totalUsers = founderData?.totalUsers ?? 0;
  const monthlyMRR = founderData?.monthlyMRR ?? 0;
  const projectedARR = founderData?.projectedARR ?? 0;
  const mrrProjection = founderData?.mrrProjection;
  const growthData = founderData?.growthData ?? [];
  const conversionRate = founderData?.conversionRate ?? 0;

  // Pie chart data for user breakdown
  const userBreakdownData = [
    { name: "Free", value: freeUsers },
    { name: "Pro", value: proUsers },
  ];

  // Export users to CSV
  const exportUsersToCSV = () => {
    if (clerkUsers.length === 0) return;

    const headers = ["Name", "Email", "Signed Up", "Last Active"];
    const rows = clerkUsers.map((u) => [
      u.fullName,
      u.email,
      new Date(u.createdAt).toLocaleString(),
      u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : "Never",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `jobfiltr-users-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedStatCard
          title="Total Users"
          value={totalUsers}
          subtitle="All registered accounts"
          icon={Users}
          gradient="bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
          delay={0}
        />
        <AnimatedStatCard
          title="Free Users"
          value={freeUsers}
          subtitle={`${conversionRate}% conversion rate`}
          icon={Zap}
          gradient="bg-gradient-to-br from-emerald-500/20 to-teal-500/20"
          delay={0.05}
        />
        <AnimatedStatCard
          title="Pro Users"
          value={proUsers}
          subtitle="Active subscriptions"
          icon={Crown}
          gradient="bg-gradient-to-br from-amber-500/20 to-orange-500/20"
          delay={0.1}
        />
        <AnimatedStatCard
          title="Monthly MRR"
          value={monthlyMRR}
          subtitle={`$${projectedARR.toLocaleString()} projected ARR`}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
          delay={0.15}
        />
      </div>

      {/* Website Traffic Chart */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-rose-500/30 shadow-lg shadow-rose-500/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-rose-400" />
              Website Traffic (Last 30 Days)
            </CardTitle>
            <CardDescription className="text-white/60">
              Daily page views and unique visitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageViewStats && pageViewStats.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={pageViewStats}>
                    <defs>
                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={10}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,15,30,0.95)",
                        border: "1px solid rgba(244,63,94,0.3)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalViews"
                      stroke="#f43f5e"
                      fill="url(#viewsGradient)"
                      strokeWidth={2}
                      name="Page Views"
                    />
                    <Area
                      type="monotone"
                      dataKey="uniqueVisitors"
                      stroke="#8b5cf6"
                      fill="url(#visitorsGradient)"
                      strokeWidth={2}
                      name="Unique Visitors"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-white/50 text-xs">Today</p>
                    <p className="text-rose-400 font-bold">
                      {pageViewStats[pageViewStats.length - 1]?.totalViews ?? 0} views
                    </p>
                    <p className="text-violet-400 text-xs">
                      {pageViewStats[pageViewStats.length - 1]?.uniqueVisitors ?? 0} visitors
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/50 text-xs">7-Day Avg</p>
                    <p className="text-rose-400 font-bold">
                      {Math.round(
                        pageViewStats.slice(-7).reduce((sum: number, d: { totalViews: number }) => sum + d.totalViews, 0) / 7
                      )} views/day
                    </p>
                    <p className="text-violet-400 text-xs">
                      {Math.round(
                        pageViewStats.slice(-7).reduce((sum: number, d: { uniqueVisitors: number }) => sum + d.uniqueVisitors, 0) / 7
                      )} visitors/day
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/50 text-xs">30-Day Total</p>
                    <p className="text-rose-400 font-bold">
                      {pageViewStats.reduce((sum: number, d: { totalViews: number }) => sum + d.totalViews, 0).toLocaleString()} views
                    </p>
                    <p className="text-violet-400 text-xs">
                      {pageViewStats.reduce((sum: number, d: { uniqueVisitors: number }) => sum + d.uniqueVisitors, 0).toLocaleString()} visitors
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                {pageViewStats === undefined ? (
                  <div className="h-8 w-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                ) : (
                  <div className="text-center">
                    <Eye className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60">No traffic data yet</p>
                    <p className="text-white/40 text-sm mt-1">Data will appear as visitors browse your site</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* MRR & Revenue Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Over Time */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white/5 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-cyan-400" />
                MRR Trend (2026)
              </CardTitle>
              <CardDescription className="text-white/60">
                Monthly recurring revenue {mrrProjection?.avgMonthlyGrowthRate ? `(${mrrProjection.avgMonthlyGrowthRate}% avg growth)` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mrrProjection?.monthlyData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={mrrProjection.monthlyData}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,15,30,0.95)",
                        border: "1px solid rgba(6,182,212,0.3)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number, name: string) => [
                        `$${value.toFixed(2)}`,
                        name === "mrr" ? "MRR" : name,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="#06b6d4"
                      fill="url(#mrrGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <div className="h-8 w-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-white/50 text-xs">Current MRR</p>
                  <p className="text-cyan-400 font-bold">${monthlyMRR.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/50 text-xs">Projected ARR</p>
                  <p className="text-cyan-400 font-bold">${projectedARR.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/50 text-xs">Year-End MRR</p>
                  <p className="text-cyan-400 font-bold">${(mrrProjection?.yearEndProjectedMRR ?? 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Growth Chart */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white/5 backdrop-blur-xl border border-green-500/30 shadow-lg shadow-green-500/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                User Growth (Last 30 Days)
              </CardTitle>
              <CardDescription className="text-white/60">
                Daily active users and scan activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={10}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,15,30,0.95)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="users" fill="#22c55e" name="Active Users" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="scans" fill="#06b6d4" name="Scans" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <div className="h-8 w-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User Breakdown & Conversion Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Type Breakdown Pie */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-400" />
                User Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={userBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {userBreakdownData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,15,30,0.95)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-white/70 text-sm">Free ({freeUsers})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-white/70 text-sm">Pro ({proUsers})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversion Rate Trend */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white/5 backdrop-blur-xl border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Conversion Rate Trend
              </CardTitle>
              <CardDescription className="text-white/60">
                Free to Pro conversion rate over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {founderData?.conversionRateData?.monthlyData ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={founderData.conversionRateData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,15,30,0.95)",
                        border: "1px solid rgba(168,85,247,0.3)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number) => [`${value}%`, "Conversion Rate"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ fill: "#a855f7", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px]">
                  <div className="h-8 w-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Revenue Summary Cards */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Revenue Summary
            </CardTitle>
            <CardDescription className="text-white/60">
              Estimated revenue at $7.99/month per Pro subscriber
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/50 text-xs mb-1">Current MRR</p>
                <p className="text-2xl font-bold text-emerald-400">${monthlyMRR.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/50 text-xs mb-1">Projected ARR</p>
                <p className="text-2xl font-bold text-cyan-400">${projectedARR.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/50 text-xs mb-1">Year-End MRR</p>
                <p className="text-2xl font-bold text-purple-400">
                  ${(mrrProjection?.yearEndProjectedMRR ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/50 text-xs mb-1">Year-End ARR</p>
                <p className="text-2xl font-bold text-amber-400">
                  ${(mrrProjection?.yearEndProjectedARR ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* User List Table */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Registered Users
              </CardTitle>
              <CardDescription className="text-white/60">
                All users with accounts ({clerkUsers.length} total)
              </CardDescription>
            </div>
            <Button
              onClick={exportUsersToCSV}
              disabled={clerkUsers.length === 0}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : clerkUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No registered users yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">#</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">User</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Email</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Signed Up</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Last Active</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clerkUsers
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((u, index) => {
                        const isActive = u.lastActiveAt && (Date.now() - u.lastActiveAt < 7 * 24 * 60 * 60 * 1000);
                        return (
                          <tr
                            key={u.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 text-white/40 text-sm">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {u.imageUrl ? (
                                  <img
                                    src={u.imageUrl}
                                    alt={u.fullName}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                                    {u.fullName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-white text-sm font-medium">{u.fullName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <a
                                href={`mailto:${u.email}`}
                                className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                              >
                                {u.email}
                              </a>
                            </td>
                            <td className="py-3 px-4 text-white/60 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-white/40" />
                                {new Date(u.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-white/60 text-sm">
                              {u.lastActiveAt ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-white/40" />
                                  {new Date(u.lastActiveAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </div>
                              ) : (
                                <span className="text-white/40">Never</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isActive
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* WAITLIST ANALYTICS SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* Divider */}
      <motion.div variants={itemVariants} className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-white/40 text-sm font-medium uppercase tracking-widest">
            Waitlist Analytics
          </span>
        </div>
      </motion.div>

      {/* Waitlist Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedStatCard
          title="Total Signups"
          value={waitlistAnalytics?.total ?? 0}
          subtitle="All waitlist entries"
          icon={UserPlus}
          gradient="bg-gradient-to-br from-indigo-500/20 to-violet-500/20"
          delay={0}
        />
        <AnimatedStatCard
          title="This Week"
          value={waitlistAnalytics?.thisWeek ?? 0}
          subtitle="Last 7 days"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-emerald-500/20 to-green-500/20"
          delay={0.05}
        />
        <AnimatedStatCard
          title="Top Location"
          value={waitlistAnalytics?.byLocation?.[0]?.count ?? 0}
          subtitle={waitlistAnalytics?.byLocation?.[0]?.location ?? "N/A"}
          icon={MapPin}
          gradient="bg-gradient-to-br from-amber-500/20 to-yellow-500/20"
          delay={0.1}
        />
        <AnimatedStatCard
          title="Conversion Rate"
          value={
            waitlistAnalytics?.total
              ? Math.round(
                  ((waitlistAnalytics.byStatus.converted) /
                    waitlistAnalytics.total) *
                    100
                )
              : 0
          }
          subtitle="Converted to users"
          icon={Target}
          gradient="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
          delay={0.15}
        />
      </div>

      {/* Signup Trend & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signup Trend */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white/5 backdrop-blur-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                Signup Trend (Last 30 Days)
              </CardTitle>
              <CardDescription className="text-white/60">
                Daily waitlist signups
              </CardDescription>
            </CardHeader>
            <CardContent>
              {waitlistAnalytics?.dailySignups ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={waitlistAnalytics.dailySignups}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={10}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,15,30,0.95)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number) => [value, "Signups"]}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      fill="url(#signupGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <div className="h-8 w-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white/5 backdrop-blur-xl border border-amber-500/30 shadow-lg shadow-amber-500/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-400" />
                Status Breakdown
              </CardTitle>
              <CardDescription className="text-white/60">
                Waitlist entry statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {waitlistAnalytics?.byStatus ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Pending", value: waitlistAnalytics.byStatus.pending },
                          { name: "Confirmed", value: waitlistAnalytics.byStatus.confirmed },
                          { name: "Invited", value: waitlistAnalytics.byStatus.invited },
                          { name: "Converted", value: waitlistAnalytics.byStatus.converted },
                        ].filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: "Pending", value: waitlistAnalytics.byStatus.pending },
                          { name: "Confirmed", value: waitlistAnalytics.byStatus.confirmed },
                          { name: "Invited", value: waitlistAnalytics.byStatus.invited },
                          { name: "Converted", value: waitlistAnalytics.byStatus.converted },
                        ]
                          .filter((d) => d.value > 0)
                          .map((_, index) => (
                            <Cell key={`status-cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15,15,30,0.95)",
                          border: "1px solid rgba(245,158,11,0.3)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {[
                      { label: "Pending", color: "bg-amber-500", count: waitlistAnalytics.byStatus.pending },
                      { label: "Confirmed", color: "bg-cyan-500", count: waitlistAnalytics.byStatus.confirmed },
                      { label: "Invited", color: "bg-violet-500", count: waitlistAnalytics.byStatus.invited },
                      { label: "Converted", color: "bg-green-500", count: waitlistAnalytics.byStatus.converted },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${s.color}`} />
                        <span className="text-white/70 text-sm">
                          {s.label} ({s.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <div className="h-8 w-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Locations & Signup Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Locations Bar Chart */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white/5 backdrop-blur-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-400" />
                Top Locations
              </CardTitle>
              <CardDescription className="text-white/60">
                Where signups are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              {waitlistAnalytics?.byLocation && waitlistAnalytics.byLocation.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={waitlistAnalytics.byLocation.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} allowDecimals={false} />
                    <YAxis
                      dataKey="location"
                      type="category"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={11}
                      width={120}
                      tickFormatter={(v) => (v.length > 18 ? v.substring(0, 16) + "..." : v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,15,30,0.95)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(value: number) => [value, "Signups"]}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <p className="text-white/40">No location data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Signup Sources */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white/5 backdrop-blur-xl border border-pink-500/30 shadow-lg shadow-pink-500/10 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-pink-400" />
                Signup Sources
              </CardTitle>
              <CardDescription className="text-white/60">
                How users found the waitlist
              </CardDescription>
            </CardHeader>
            <CardContent>
              {waitlistAnalytics?.bySource && waitlistAnalytics.bySource.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={waitlistAnalytics.bySource}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="source"
                      >
                        {waitlistAnalytics.bySource.map((_, index) => (
                          <Cell key={`source-cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15,15,30,0.95)",
                          border: "1px solid rgba(236,72,153,0.3)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 mt-2">
                    {waitlistAnalytics.bySource.map((s, i) => (
                      <div key={s.source} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                        />
                        <span className="text-white/70 text-sm">
                          {s.source} ({s.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <p className="text-white/40">No source data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Location Table */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-teal-500/30 shadow-lg shadow-teal-500/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-400" />
              All Locations
            </CardTitle>
            <CardDescription className="text-white/60">
              Full geographic breakdown ({waitlistAnalytics?.byLocation?.length ?? 0} unique locations)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {waitlistAnalytics?.byLocation && waitlistAnalytics.byLocation.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">#</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Location</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Signups</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">% of Total</th>
                      <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlistAnalytics.byLocation.map((loc, index) => {
                      const pct = waitlistAnalytics.total
                        ? ((loc.count / waitlistAnalytics.total) * 100).toFixed(1)
                        : "0";
                      return (
                        <tr
                          key={loc.location}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-4 text-white/40 text-sm">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-teal-400/60" />
                              <span className="text-white text-sm font-medium">{loc.location}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-white/80 text-sm font-mono">{loc.count}</td>
                          <td className="py-3 px-4 text-white/60 text-sm">{pct}%</td>
                          <td className="py-3 px-4">
                            <div className="w-full bg-white/10 rounded-full h-2 max-w-[200px]">
                              <div
                                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.max(
                                    (loc.count / (waitlistAnalytics.byLocation[0]?.count || 1)) * 100,
                                    4
                                  )}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No location data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
