"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderNav } from "@/components/HeaderNav";
import { useUser } from "@clerk/nextjs";
import { WAITLIST_MODE, FOUNDER_EMAILS } from "@/lib/feature-flags";
import {
  BarChart3,
  Users,
  Activity,
  Mail,
  Download,
  Clock,
  Flag,
  MapPin,
  Plus,
  Trash2,
  ShieldX,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedStatCard } from "@/components/admin/AnimatedStatCard";
import { UserInsightsTab } from "@/components/admin/UserInsightsTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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


export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState("analytics");

  // Founder-only access guard
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isFounder = !!userEmail && FOUNDER_EMAILS.includes(userEmail);

  // All hooks must be called before any early returns
  // Data queries
  const scanStats = useQuery(api.analytics.getScanStats);
  const userStats = useQuery(api.analytics.getUserActivityStats);
  const dailyVisitors = useQuery(api.analytics.getDailyVisitors);

  // Waitlist queries
  const waitlistStats = useQuery(api.waitlist.getWaitlistStats);
  const waitlistEntries = useQuery(api.waitlist.getAllWaitlistEntries);

  // Community reports (from feedback with type="report")
  const communityReports = useQuery(api.feedback.getAllFeedback, { type: "report" });

  // Waitlist mutations
  const addEntry = useMutation(api.waitlist.adminAddEntry);
  const removeEntry = useMutation(api.waitlist.adminRemoveEntry);

  // Add entry form state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    name: "",
    location: "",
    source: "",
    status: "pending" as "pending" | "confirmed" | "invited" | "converted",
  });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"waitlist">; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Report removal
  const removeReport = useMutation(api.feedback.adminRemoveEntry);
  const [deleteReportTarget, setDeleteReportTarget] = useState<{ id: Id<"feedback">; company: string } | null>(null);
  const [deleteReportLoading, setDeleteReportLoading] = useState(false);

  if (WAITLIST_MODE && isLoaded && !isFounder) {
    return (
      <>
        <HeaderNav />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-900">
          <div className="text-center max-w-md px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-6">
              <ShieldX className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
            <p className="text-white/60 mb-6">This page is restricted to authorized administrators.</p>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Return to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  const handleAddEntry = async () => {
    if (!addForm.email.trim()) {
      setAddError("Email is required");
      return;
    }
    setAddError("");
    setAddLoading(true);
    try {
      const result = await addEntry({
        email: addForm.email,
        name: addForm.name || undefined,
        location: addForm.location || undefined,
        source: addForm.source || undefined,
        status: addForm.status,
      });
      if (!result.success) {
        setAddError("This email is already on the waitlist");
      } else {
        setAddDialogOpen(false);
        setAddForm({ email: "", name: "", location: "", source: "", status: "pending" });
      }
    } catch {
      setAddError("Failed to add entry");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveEntry = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeEntry({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch {
      // silent
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRemoveReport = async () => {
    if (!deleteReportTarget) return;
    setDeleteReportLoading(true);
    try {
      await removeReport({ id: deleteReportTarget.id });
      setDeleteReportTarget(null);
    } catch {
      // silent
    } finally {
      setDeleteReportLoading(false);
    }
  };

  // Export reports to CSV
  const exportReportsToCSV = () => {
    if (!communityReports || communityReports.length === 0) return;

    const headers = ["Submitted By", "Email", "Company/Message", "Scam", "Spam", "Ghost", "Status", "Date"];
    const rows = communityReports.map((report) => [
      report.userName || "Anonymous",
      report.email || "",
      report.message,
      report.reportCategories?.scamJob ? "Yes" : "No",
      report.reportCategories?.spamJob ? "Yes" : "No",
      report.reportCategories?.ghostJob ? "Yes" : "No",
      report.status,
      new Date(report.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `jobfiltr-community-reports-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Export waitlist to CSV
  const exportToCSV = () => {
    if (!waitlistEntries || waitlistEntries.length === 0) return;

    const headers = ["Email", "Name", "Location", "Source", "Status", "Signed Up"];
    const rows = waitlistEntries.map((entry) => [
      entry.email,
      entry.name || "",
      entry.location || "",
      entry.source || "",
      entry.status,
      new Date(entry.createdAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `jobfiltr-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

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
            <h1 className="text-6xl font-bold text-white mb-3 tracking-tight">
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
                value="waitlist"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/50 transition-all duration-300"
              >
                <Mail className="mr-2 h-4 w-4" />
                Waitlist
                {waitlistStats?.total ? (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                    {waitlistStats.total}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50 transition-all duration-300"
              >
                <Eye className="mr-2 h-4 w-4" />
                User Insights
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

                {/* Community Reports Section */}
                <motion.div variants={itemVariants}>
                  <Card className="bg-white/5 backdrop-blur-xl border border-orange-500/30 shadow-lg shadow-orange-500/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Flag className="h-5 w-5 text-orange-400" />
                          Community Reports
                        </CardTitle>
                        <CardDescription className="text-white/60">Company reports submitted from the Contact page</CardDescription>
                      </div>
                      <Button
                        onClick={exportReportsToCSV}
                        disabled={!communityReports || communityReports.length === 0}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {!communityReports ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="h-8 w-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                        </div>
                      ) : communityReports.length === 0 ? (
                        <div className="text-center py-12">
                          <Flag className="h-12 w-12 text-white/20 mx-auto mb-4" />
                          <p className="text-white/60">No community reports yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Submitted By</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Email</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Company</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Report Type</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Status</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Date</th>
                                <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {communityReports.map((report) => (
                                <tr
                                  key={report._id}
                                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                  <td className="py-3 px-4 text-white text-sm">
                                    {report.userName || <span className="text-white/40">Anonymous</span>}
                                  </td>
                                  <td className="py-3 px-4">
                                    {report.email ? (
                                      <a
                                        href={`mailto:${report.email}`}
                                        className="text-orange-400 hover:text-orange-300 transition-colors text-sm"
                                      >
                                        {report.email}
                                      </a>
                                    ) : (
                                      <span className="text-white/40 text-sm">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-white text-sm max-w-[200px] truncate">
                                    {report.message}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      {report.reportCategories?.scamJob && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                          Scam
                                        </span>
                                      )}
                                      {report.reportCategories?.spamJob && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                                          Spam
                                        </span>
                                      )}
                                      {report.reportCategories?.ghostJob && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                          Ghost
                                        </span>
                                      )}
                                      {!report.reportCategories?.scamJob &&
                                       !report.reportCategories?.spamJob &&
                                       !report.reportCategories?.ghostJob && (
                                        <span className="text-white/40 text-sm">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        report.status === "new"
                                          ? "bg-cyan-500/20 text-cyan-400"
                                          : report.status === "reviewing"
                                          ? "bg-amber-500/20 text-amber-400"
                                          : report.status === "resolved"
                                          ? "bg-green-500/20 text-green-400"
                                          : "bg-gray-500/20 text-gray-400"
                                      }`}
                                    >
                                      {report.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-white/60 text-sm">
                                    {new Date(report.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteReportTarget({ id: report._id, company: report.message })}
                                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delete report confirmation dialog */}
                  <Dialog open={!!deleteReportTarget} onOpenChange={(open) => { if (!open) setDeleteReportTarget(null); }}>
                    <DialogContent className="bg-gray-900 border-white/10 text-white">
                      <DialogHeader>
                        <DialogTitle>Remove Community Report</DialogTitle>
                        <DialogDescription className="text-white/60">
                          Are you sure you want to remove this report for <span className="text-red-400 font-medium">{deleteReportTarget?.company}</span>? This cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="ghost"
                          onClick={() => setDeleteReportTarget(null)}
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleRemoveReport}
                          disabled={deleteReportLoading}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          {deleteReportLoading ? "Removing..." : "Remove"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </motion.div>
            </TabsContent>

            {/* Waitlist Tab */}
            <TabsContent value="waitlist">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <motion.div variants={itemVariants}>
                    <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/20">
                            <Users className="h-5 w-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Total Signups</p>
                            <p className="text-2xl font-bold text-white">{waitlistStats?.total || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/20">
                            <Clock className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Pending</p>
                            <p className="text-2xl font-bold text-white">{waitlistStats?.byStatus?.pending || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/20">
                            <Mail className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Invited</p>
                            <p className="text-2xl font-bold text-white">{waitlistStats?.byStatus?.invited || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <Activity className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white/60 text-sm">Converted</p>
                            <p className="text-2xl font-bold text-white">{waitlistStats?.byStatus?.converted || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Waitlist Table */}
                <motion.div variants={itemVariants}>
                  <Card className="bg-white/5 backdrop-blur-xl border border-green-500/30">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Mail className="h-5 w-5 text-green-400" />
                          Waitlist Signups
                        </CardTitle>
                        <CardDescription className="text-white/60">
                          All users who have joined the waitlist
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) setAddError(""); }}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Entry
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-white/10 text-white">
                            <DialogHeader>
                              <DialogTitle>Add Waitlist Entry</DialogTitle>
                              <DialogDescription className="text-white/60">
                                Manually add a new entry to the waitlist.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="add-email">Email *</Label>
                                <Input
                                  id="add-email"
                                  type="email"
                                  placeholder="user@example.com"
                                  value={addForm.email}
                                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="add-name">Name</Label>
                                <Input
                                  id="add-name"
                                  placeholder="John Doe"
                                  value={addForm.name}
                                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="add-location">Location</Label>
                                <Input
                                  id="add-location"
                                  placeholder="New York, NY"
                                  value={addForm.location}
                                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="add-source">Source</Label>
                                <Input
                                  id="add-source"
                                  placeholder="admin, referral, etc."
                                  value={addForm.source}
                                  onChange={(e) => setAddForm({ ...addForm, source: e.target.value })}
                                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                  value={addForm.status}
                                  onValueChange={(val) => setAddForm({ ...addForm, status: val as typeof addForm.status })}
                                >
                                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900 border-white/10">
                                    <SelectItem value="pending" className="text-white">Pending</SelectItem>
                                    <SelectItem value="confirmed" className="text-white">Confirmed</SelectItem>
                                    <SelectItem value="invited" className="text-white">Invited</SelectItem>
                                    <SelectItem value="converted" className="text-white">Converted</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {addError && (
                                <p className="text-red-400 text-sm">{addError}</p>
                              )}
                            </div>
                            <DialogFooter>
                              <Button
                                variant="ghost"
                                onClick={() => setAddDialogOpen(false)}
                                className="text-white/60 hover:text-white hover:bg-white/10"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleAddEntry}
                                disabled={addLoading}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                              >
                                {addLoading ? "Adding..." : "Add Entry"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          onClick={exportToCSV}
                          disabled={!waitlistEntries || waitlistEntries.length === 0}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export CSV
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!waitlistEntries ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="h-8 w-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                        </div>
                      ) : waitlistEntries.length === 0 ? (
                        <div className="text-center py-12">
                          <Mail className="h-12 w-12 text-white/20 mx-auto mb-4" />
                          <p className="text-white/60">No waitlist signups yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">#</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Email</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Name</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Location</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Source</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Status</th>
                                <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Signed Up</th>
                                <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {waitlistEntries.map((entry, index) => (
                                <tr
                                  key={entry._id}
                                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                  <td className="py-3 px-4 text-white/40 text-sm">
                                    {waitlistEntries.length - index}
                                  </td>
                                  <td className="py-3 px-4">
                                    <a
                                      href={`mailto:${entry.email}`}
                                      className="text-green-400 hover:text-green-300 transition-colors text-sm"
                                    >
                                      {entry.email}
                                    </a>
                                  </td>
                                  <td className="py-3 px-4 text-white text-sm">
                                    {entry.name || <span className="text-white/40">—</span>}
                                  </td>
                                  <td className="py-3 px-4 text-white text-sm">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-white/40" />
                                      {entry.location || <span className="text-white/40">—</span>}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-white/60 text-sm">
                                    {entry.source || "—"}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        entry.status === "pending"
                                          ? "bg-amber-500/20 text-amber-400"
                                          : entry.status === "confirmed"
                                          ? "bg-green-500/20 text-green-400"
                                          : entry.status === "invited"
                                          ? "bg-blue-500/20 text-blue-400"
                                          : "bg-purple-500/20 text-purple-400"
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-white/60 text-sm">
                                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteTarget({ id: entry._id, email: entry.email })}
                                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delete confirmation dialog */}
                  <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                    <DialogContent className="bg-gray-900 border-white/10 text-white">
                      <DialogHeader>
                        <DialogTitle>Remove Waitlist Entry</DialogTitle>
                        <DialogDescription className="text-white/60">
                          Are you sure you want to remove <span className="text-red-400 font-medium">{deleteTarget?.email}</span> from the waitlist? This cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="ghost"
                          onClick={() => setDeleteTarget(null)}
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleRemoveEntry}
                          disabled={deleteLoading}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          {deleteLoading ? "Removing..." : "Remove"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </motion.div>
            </TabsContent>

            {/* User Insights Tab */}
            <TabsContent value="insights">
              <UserInsightsTab />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </>
  );
}
