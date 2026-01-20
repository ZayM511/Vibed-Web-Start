"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderNav } from "@/components/HeaderNav";
import {
  BarChart3,
  Globe2,
  Users,
  Activity,
  Target,
  Database,
  AlertTriangle,
  ShieldAlert,
  Bug,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedStatCard } from "@/components/admin/AnimatedStatCard";
import { InteractiveGlobe } from "@/components/admin/InteractiveGlobe";
import { ExtensionErrorsTab } from "@/components/admin/ExtensionErrorsTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

// Futuristic color scheme
const COLORS = {
  cyan: "#00f0ff",
  magenta: "#ff00ff",
  green: "#00ff88",
  orange: "#ffaa00",
  red: "#ff0055",
  primary: "#6366f1",
  secondary: "#a855f7",
  scam: "#ef4444",
  ghost: "#f59e0b",
  spam: "#a855f7",
  legitimate: "#22c55e",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("analytics");

  // Data queries
  const scanStats = useQuery(api.analytics.getScanStats);
  const userStats = useQuery(api.analytics.getUserActivityStats);
  const dailyVisitors = useQuery(api.analytics.getDailyVisitors);
  const modelPerformance = useQuery(api.analytics.getModelPerformance);
  const userLocations = useQuery(api.analytics.getActiveUserLocations);

  // Real-time data only
  const detectionResultsData = [
    { name: "Scam", count: scanStats?.scamDetected || 0, fill: COLORS.scam },
    { name: "Ghost Job", count: scanStats?.ghostDetected || 0, fill: COLORS.ghost },
    { name: "Spam", count: scanStats?.spamDetected || 0, fill: COLORS.spam },
    { name: "Legitimate", count: scanStats?.legitimateCount || 0, fill: COLORS.legitimate },
  ];

  return (
    <>
      <HeaderNav />

      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-900" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />
        </div>
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="min-h-screen pt-20 px-4 pb-12 relative">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 text-transparent bg-clip-text mb-3 tracking-tight">
              Admin Command Center
            </h1>
            <p className="text-white/60 text-lg font-light">Real-time system monitoring and control</p>
          </motion.div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-white/5 backdrop-blur-xl border-2 border-cyan-500/30 p-1.5 h-auto shadow-lg shadow-cyan-500/20">
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/50 transition-all duration-300"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="globe"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/50 transition-all duration-300"
              >
                <Globe2 className="mr-2 h-4 w-4" />
                Global Activity
              </TabsTrigger>
              <TabsTrigger
                value="errors"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/50 transition-all duration-300"
              >
                <Bug className="mr-2 h-4 w-4" />
                Extension Errors
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
              >
                {/* Top Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatedStatCard
                    title="Total Users"
                    value={userStats?.totalUsers || 0}
                    subtitle={`${userStats?.activeSubscribers || 0} subscribers`}
                    icon={Users}
                    gradient="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                    delay={0}
                  />
                  <AnimatedStatCard
                    title="Total Scans"
                    value={scanStats?.total || 0}
                    subtitle={`${dailyVisitors?.scansToday || 0} today`}
                    icon={Activity}
                    gradient="bg-gradient-to-br from-orange-500/20 to-red-500/20"
                    delay={0.1}
                  />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Detection Results */}
                  <motion.div variants={itemVariants}>
                    <Card className="bg-white/5 backdrop-blur-xl border border-orange-500/30 shadow-lg shadow-orange-500/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-orange-400" />
                          Detection Results
                        </CardTitle>
                        <CardDescription className="text-white/60">Scam classification breakdown</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={detectionResultsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                            <YAxis stroke="rgba(255,255,255,0.5)" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(0,0,0,0.9)",
                                border: "1px solid rgba(255,170,0,0.5)",
                                borderRadius: "8px",
                              }}
                            />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                              {detectionResultsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Model Performance Section */}
                <motion.div variants={itemVariants}>
                  <Card className="bg-white/5 backdrop-blur-xl border border-white/20">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-cyan-400" />
                        <CardTitle className="text-white">AI Model Performance</CardTitle>
                      </div>
                      <CardDescription className="text-white/60">
                        Precision and Recall metrics for detection categories
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Scam Detection */}
                        <div className="p-6 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500/30">
                          <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="h-5 w-5 text-red-400" />
                            <h3 className="text-white font-semibold">Scam Detection</h3>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white/70">Precision</span>
                                <span className="text-white font-mono font-medium">{modelPerformance?.scamPrecision || 0}%</span>
                              </div>
                              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${modelPerformance?.scamPrecision || 0}%` }}
                                  transition={{ duration: 1, delay: 0.2 }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white/70">Recall</span>
                                <span className="text-white font-mono font-medium">{modelPerformance?.scamRecall || 0}%</span>
                              </div>
                              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${modelPerformance?.scamRecall || 0}%` }}
                                  transition={{ duration: 1, delay: 0.3 }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ghost Job Detection */}
                        <div className="p-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30">
                          <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                            <h3 className="text-white font-semibold">Ghost Jobs</h3>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white/70">Precision</span>
                                <span className="text-white font-mono font-medium">{modelPerformance?.ghostPrecision || 0}%</span>
                              </div>
                              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${modelPerformance?.ghostPrecision || 0}%` }}
                                  transition={{ duration: 1, delay: 0.4 }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white/70">Recall</span>
                                <span className="text-white font-mono font-medium">{modelPerformance?.ghostRecall || 0}%</span>
                              </div>
                              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${modelPerformance?.ghostRecall || 0}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Spam Detection */}
                        <div className="p-6 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-2 border-purple-500/30">
                          <div className="flex items-center gap-2 mb-4">
                            <Database className="h-5 w-5 text-purple-400" />
                            <h3 className="text-white font-semibold">Spam Detection</h3>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white/70">Precision</span>
                                <span className="text-white font-mono font-medium">{modelPerformance?.spamPrecision || 0}%</span>
                              </div>
                              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${modelPerformance?.spamPrecision || 0}%` }}
                                  transition={{ duration: 1, delay: 0.6 }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white/70">Recall</span>
                                <span className="text-white font-mono font-medium">{modelPerformance?.spamRecall || 0}%</span>
                              </div>
                              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${modelPerformance?.spamRecall || 0}%` }}
                                  transition={{ duration: 1, delay: 0.7 }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>

            {/* Globe Tab */}
            <TabsContent value="globe">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <InteractiveGlobe markers={userLocations} />
              </motion.div>
            </TabsContent>

            {/* Extension Errors Tab */}
            <TabsContent value="errors">
              <ExtensionErrorsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
