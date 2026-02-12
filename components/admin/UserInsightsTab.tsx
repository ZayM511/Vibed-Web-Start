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

export function UserInsightsTab() {
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  // Founder dashboard data from Convex
  const founderData = useQuery(api.analytics.getFounderDashboard, { userEmail });

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

      {/* MRR & Revenue Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Over Time */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
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
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-xl border border-green-500/30 shadow-lg shadow-green-500/10">
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
    </motion.div>
  );
}
