"use client";

import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSubscription, useScanUsage } from "@/hooks/use-subscription";
import { CountingNumber } from "@/components/ui/counting-number";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Zap,
  TrendingUp,
  Shield,
  Clock,
  FileText,
  BarChart3,
  Award,
  ArrowUpRight,
  Calendar,
  Target,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  suffix?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
  isAnimated?: boolean;
}

function StatCard({ title, value, icon: Icon, gradient, iconColor, suffix = "", trend, delay = 0, isAnimated = true }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-300 group">
        {/* Gradient overlay */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-300", gradient)} />

        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-white/60">{title}</CardTitle>
            <div className={cn("p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10")}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {isAnimated && typeof value === 'number' ? (
                <CountingNumber number={value} inView />
              ) : (
                value
              )}
              {suffix}
            </span>
            {trend && (
              <Badge
                variant="outline"
                className={cn(
                  "border-0 text-xs",
                  trend.isPositive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/20 text-rose-400"
                )}
              >
                <TrendingUp className={cn("h-3 w-3 mr-1", !trend.isPositive && "rotate-180")} />
                {trend.value}%
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  iconColor: string;
}

function ActivityItem({ title, description, time, icon: Icon, iconColor }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200">
      <div className={cn("p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mt-0.5")}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      </div>
      <span className="text-xs text-white/40 whitespace-nowrap">{time}</span>
    </div>
  );
}

export function AccountOverview() {
  const { user } = useUser();
  const { isPro, isFree } = useSubscription();
  const { totalScans, scansRemaining, isUnlimited } = useScanUsage();
  const allDocuments = useQuery(api.documents.getUserDocuments);

  // Calculate stats
  const documentCount = allDocuments?.length || 0;
  const accountAge = user?.createdAt ? Math.floor((Date.now() - Number(user.createdAt)) / (1000 * 60 * 60 * 24)) : 0;
  const scansUsed = isPro ? totalScans : Math.min(totalScans, 3);
  const scanLimit = isPro ? "Unlimited" : "3";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Account Overview
          </h2>
          <p className="text-white/60">
            Your complete account dashboard and insights
          </p>
        </div>

        {/* Account Type Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-white/[0.08] to-white/[0.04] backdrop-blur-sm border border-white/10 rounded-xl">
          {isPro ? (
            <>
              <Crown className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-xs text-white/60">Account Type</p>
                <p className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-300">
                  Pro Member
                </p>
              </div>
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-xs text-white/60">Account Type</p>
                <p className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-300">
                  Free Plan
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scans"
          value={scansUsed}
          icon={Shield}
          gradient="from-indigo-500/20 to-purple-500/20"
          iconColor="text-indigo-400"
          delay={0.1}
        />
        <StatCard
          title="Scans Remaining"
          value={isUnlimited ? "∞" : scansRemaining}
          icon={Target}
          gradient="from-cyan-500/20 to-blue-500/20"
          iconColor="text-cyan-400"
          delay={0.2}
          isAnimated={!isUnlimited}
        />
        <StatCard
          title="Documents Saved"
          value={documentCount}
          icon={FileText}
          gradient="from-rose-500/20 to-pink-500/20"
          iconColor="text-rose-400"
          delay={0.3}
        />
        <StatCard
          title="Member Since"
          value={accountAge}
          icon={Calendar}
          gradient="from-amber-500/20 to-orange-500/20"
          iconColor="text-amber-400"
          suffix=" days"
          delay={0.4}
        />
      </div>

      {/* Two Column Layout for Pro Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Features */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scan Usage Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Scan Usage</CardTitle>
                    <CardDescription className="text-white/60">
                      Track your job posting scans
                    </CardDescription>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <BarChart3 className="h-6 w-6 text-indigo-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">Usage</span>
                      <span className="text-sm font-medium text-white">
                        {isUnlimited ? `${scansUsed} scans` : `${scansUsed} / ${scanLimit}`}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: isUnlimited ? "100%" : `${(scansUsed / 3) * 100}%`
                        }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className={cn(
                          "h-full rounded-full",
                          isPro
                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                            : scansUsed >= 3
                            ? "bg-gradient-to-r from-rose-500 to-red-500"
                            : "bg-gradient-to-r from-indigo-500 to-purple-500"
                        )}
                      />
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border",
                    isPro
                      ? "bg-amber-500/10 border-amber-500/30"
                      : scansRemaining > 0
                      ? "bg-indigo-500/10 border-indigo-500/30"
                      : "bg-rose-500/10 border-rose-500/30"
                  )}>
                    {isPro ? (
                      <Crown className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    ) : scansRemaining > 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium",
                        isPro
                          ? "text-amber-300"
                          : scansRemaining > 0
                          ? "text-indigo-300"
                          : "text-rose-300"
                      )}>
                        {isPro
                          ? "Unlimited scans with Pro"
                          : scansRemaining > 0
                          ? `${scansRemaining} scan${scansRemaining !== 1 ? 's' : ''} remaining`
                          : "Scan limit reached"}
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        {isPro
                          ? "Enjoy unlimited job posting scans with advanced AI analysis"
                          : scansRemaining > 0
                          ? "Upgrade to Pro for unlimited scans and advanced features"
                          : "Upgrade to Pro to continue scanning job postings"}
                      </p>
                    </div>
                  </div>

                  {/* Upgrade CTA for Free Users */}
                  {isFree && (
                    <Button
                      onClick={() => window.location.href = "/pricing"}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pro Exclusive Features */}
          {isPro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm border-amber-500/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                      <Award className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Pro Benefits</CardTitle>
                      <CardDescription className="text-white/60">
                        Exclusive features for Pro members
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { icon: Shield, label: "Unlimited Scans", color: "text-indigo-400" },
                      { icon: Activity, label: "Advanced AI Analysis", color: "text-purple-400" },
                      { icon: BarChart3, label: "Detailed Reports", color: "text-cyan-400" },
                      { icon: Clock, label: "Priority Support", color: "text-amber-400" },
                      { icon: FileText, label: "Export Results", color: "text-rose-400" },
                      { icon: TrendingUp, label: "Scan History", color: "text-emerald-400" },
                    ].map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <benefit.icon className={cn("h-4 w-4", benefit.color)} />
                        <span className="text-sm text-white/80">{benefit.label}</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column - Recent Activity & Quick Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => window.location.href = "/filtr"}
                  className="w-full justify-start bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-white"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Scan New Job
                </Button>
                <Button
                  onClick={() => window.location.href = "/dashboard?tab=documents"}
                  variant="outline"
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border-white/10 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
                {isFree && (
                  <Button
                    onClick={() => window.location.href = "/pricing"}
                    className="w-full justify-start bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-white"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    View Pro Plans
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity (Pro Only) */}
          {isPro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">Recent Activity</CardTitle>
                    <Activity className="h-4 w-4 text-white/40" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ActivityItem
                    title="Job Scan Completed"
                    description="Senior Developer at TechCorp"
                    time="2h ago"
                    icon={Shield}
                    iconColor="text-indigo-400"
                  />
                  <ActivityItem
                    title="Document Uploaded"
                    description="Resume_Updated.pdf"
                    time="1d ago"
                    icon={FileText}
                    iconColor="text-rose-400"
                  />
                  <ActivityItem
                    title="Scan Report Exported"
                    description="Monthly scan summary"
                    time="3d ago"
                    icon={BarChart3}
                    iconColor="text-cyan-400"
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Account Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <CardTitle className="text-white text-lg">Account Health</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-sm text-white/80">Profile Complete</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                    100%
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm text-white/80">Security</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                    Secure
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm text-white/80">Documents</span>
                  <Badge className="bg-indigo-500/20 text-indigo-400 border-0">
                    {documentCount} saved
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
