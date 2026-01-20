"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Code,
  MapPin,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

type Platform = "linkedin" | "indeed";

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

export function ExtensionErrorsTab() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | undefined>(undefined);
  const [selectedError, setSelectedError] = useState<Id<"extensionErrors"> | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  // Fetch data
  const stats = useQuery(api.extensionErrors.getErrorStats);
  const errors = useQuery(api.extensionErrors.getErrors, {
    platform: selectedPlatform,
    resolved: showResolved ? undefined : false,
    limit: 100,
  });
  const groupedErrors = useQuery(api.extensionErrors.getGroupedErrors, {
    platform: selectedPlatform,
  });
  const selectedErrorData = useQuery(
    api.extensionErrors.getError,
    selectedError ? { id: selectedError } : "skip"
  );

  // Mutations
  const markResolved = useMutation(api.extensionErrors.markResolved);
  const deleteError = useMutation(api.extensionErrors.deleteError);

  const handleMarkResolved = async (id: Id<"extensionErrors">) => {
    await markResolved({
      id,
      resolvedBy: "founder",
      notes: "Marked as resolved from founder dashboard",
    });
  };

  const handleDelete = async (id: Id<"extensionErrors">) => {
    await deleteError({ id });
    if (selectedError === id) {
      setSelectedError(null);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-xl border border-red-500/30 shadow-lg shadow-red-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
              <p className="text-xs text-white/60 mt-1">All time</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Last 24 Hours</CardTitle>
              <Clock className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.last24Hours || 0}</div>
              <p className="text-xs text-white/60 mt-1">Recent activity</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-xl border border-orange-500/30 shadow-lg shadow-orange-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Unresolved</CardTitle>
              <XCircle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.unresolved || 0}</div>
              <p className="text-xs text-white/60 mt-1">Needs attention</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/5 backdrop-blur-xl border border-green-500/30 shadow-lg shadow-green-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Last 7 Days</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.last7Days || 0}</div>
              <p className="text-xs text-white/60 mt-1">Weekly trend</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Platform Stats */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/5 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <CardHeader>
            <CardTitle className="text-white">Errors by Platform</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-8">
            <div className="flex-1">
              <div className="text-sm text-white/60">LinkedIn</div>
              <div className="text-3xl font-bold text-cyan-400">{stats?.byPlatform.linkedin || 0}</div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-white/60">Indeed</div>
              <div className="text-3xl font-bold text-blue-400">{stats?.byPlatform.indeed || 0}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
        <Button
          variant={selectedPlatform === undefined ? "default" : "outline"}
          onClick={() => setSelectedPlatform(undefined)}
          size="sm"
          className={selectedPlatform === undefined
            ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            : "bg-white/5 border-white/20 text-white hover:bg-white/10"}
        >
          All Platforms
        </Button>
        <Button
          variant={selectedPlatform === "linkedin" ? "default" : "outline"}
          onClick={() => setSelectedPlatform("linkedin")}
          size="sm"
          className={selectedPlatform === "linkedin"
            ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            : "bg-white/5 border-white/20 text-white hover:bg-white/10"}
        >
          LinkedIn
        </Button>
        <Button
          variant={selectedPlatform === "indeed" ? "default" : "outline"}
          onClick={() => setSelectedPlatform("indeed")}
          size="sm"
          className={selectedPlatform === "indeed"
            ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            : "bg-white/5 border-white/20 text-white hover:bg-white/10"}
        >
          Indeed
        </Button>
        <div className="ml-auto">
          <Button
            variant={showResolved ? "default" : "outline"}
            onClick={() => setShowResolved(!showResolved)}
            size="sm"
            className={showResolved
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              : "bg-white/5 border-white/20 text-white hover:bg-white/10"}
          >
            {showResolved ? "Showing All" : "Hide Resolved"}
          </Button>
        </div>
      </motion.div>

      {/* Tabs for different views */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="grouped" className="w-full">
          <TabsList className="bg-white/5 backdrop-blur-xl border border-cyan-500/30">
            <TabsTrigger
              value="grouped"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              Grouped Errors
            </TabsTrigger>
            <TabsTrigger
              value="individual"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              Individual Errors
            </TabsTrigger>
          </TabsList>

          {/* Grouped Errors */}
          <TabsContent value="grouped" className="space-y-4 mt-6">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {groupedErrors?.map((group: any) => (
              <Card key={group.message} className={`bg-white/5 backdrop-blur-xl border ${
                group.resolved
                  ? "border-white/10 opacity-60"
                  : "border-red-500/30 shadow-lg shadow-red-500/10"
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2 text-white">
                        <Code className="h-4 w-4 text-cyan-400" />
                        {group.errorType}
                      </CardTitle>
                      <CardDescription className="mt-1 text-white/60">{group.message}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={group.resolved ? "secondary" : "destructive"} className={
                        group.resolved
                          ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-red-500/20 text-red-300 border-red-500/30"
                      }>
                        {group.count} occurrence{group.count > 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                        {group.platform}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <div className="flex items-center gap-4">
                      <span>First: {new Date(group.firstOccurrence).toLocaleString()}</span>
                      <span>Last: {new Date(group.lastOccurrence).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2">
                      {group.instances.slice(0, 1).map((instanceId: Id<"extensionErrors">) => (
                        <Button
                          key={instanceId}
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedError(instanceId)}
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                        >
                          View Details
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Individual Errors */}
          <TabsContent value="individual" className="space-y-4 mt-6">
            {errors?.map((error) => (
              <ErrorCard
                key={error._id}
                error={error}
                onMarkResolved={handleMarkResolved}
                onDelete={handleDelete}
                onViewDetails={() => setSelectedError(error._id)}
              />
            ))}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Error Details Modal/Panel */}
      {selectedErrorData && (
        <ErrorDetailsPanel
          error={selectedErrorData}
          onClose={() => setSelectedError(null)}
          onMarkResolved={handleMarkResolved}
          onDelete={handleDelete}
        />
      )}
    </motion.div>
  );
}

// Error Card Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ErrorCard({ error, onMarkResolved, onDelete, onViewDetails }: any) {
  return (
    <Card className={`bg-white/5 backdrop-blur-xl border ${
      error.resolved
        ? "border-white/10 opacity-60"
        : "border-red-500/30 shadow-lg shadow-red-500/10"
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Code className="h-4 w-4 text-cyan-400" />
              {error.errorType}
            </CardTitle>
            <CardDescription className="mt-1 text-white/60">{error.message}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={error.resolved ? "secondary" : "destructive"} className={
              error.resolved
                ? "bg-green-500/20 text-green-300 border-green-500/30"
                : "bg-red-500/20 text-red-300 border-red-500/30"
            }>
              {error.resolved ? "Resolved" : "Active"}
            </Badge>
            <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              {error.platform}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-white/60">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {new Date(error.timestamp).toLocaleString()}
          </div>
          {error.jobContext?.jobTitle && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {error.jobContext.jobTitle} at {error.jobContext.company}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            View Full Details
          </Button>
          {!error.resolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkResolved(error._id)}
              className="bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Resolved
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(error._id)}
            className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Error Details Panel Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ErrorDetailsPanel({ error, onClose, onMarkResolved, onDelete }: any) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-gray-900/95 backdrop-blur-xl border border-cyan-500/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Code className="h-5 w-5 text-cyan-400" />
                {error.errorType}
              </CardTitle>
              <CardDescription className="mt-2 text-white/60">{error.message}</CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-white/60">Platform</div>
              <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mt-1">
                {error.platform}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-white/60">Status</div>
              <Badge variant={error.resolved ? "secondary" : "destructive"} className={
                error.resolved
                  ? "bg-green-500/20 text-green-300 border-green-500/30 mt-1"
                  : "bg-red-500/20 text-red-300 border-red-500/30 mt-1"
              }>
                {error.resolved ? "Resolved" : "Active"}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-white/60">Timestamp</div>
              <div className="text-sm text-white mt-1">{new Date(error.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-white/60">Extension Version</div>
              <div className="text-sm text-white mt-1">{error.extensionVersion}</div>
            </div>
          </div>

          {/* URL */}
          <div>
            <div className="text-sm font-medium mb-2 text-white/60">URL</div>
            <a
              href={error.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {error.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Job Context */}
          {error.jobContext && (
            <div>
              <div className="text-sm font-medium mb-2 text-white/60">Job Context</div>
              <div className="text-sm space-y-1 text-white">
                {error.jobContext.jobTitle && <div>Title: {error.jobContext.jobTitle}</div>}
                {error.jobContext.company && <div>Company: {error.jobContext.company}</div>}
                {error.jobContext.jobId && <div>Job ID: {error.jobContext.jobId}</div>}
              </div>
            </div>
          )}

          {/* Stack Trace */}
          {error.stack && (
            <div>
              <div className="text-sm font-medium mb-2 text-white/60">Stack Trace</div>
              <pre className="bg-black/50 p-4 rounded-md text-xs overflow-auto max-h-60 text-cyan-300 border border-cyan-500/30">
                {error.stack}
              </pre>
            </div>
          )}

          {/* Console Logs */}
          {error.consoleLogs && error.consoleLogs.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2 text-white/60">
                Console Logs ({error.consoleLogs.length})
              </div>
              <div className="bg-black/50 p-4 rounded-md space-y-1 text-xs max-h-60 overflow-auto border border-cyan-500/30">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {error.consoleLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-white/40">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span
                      className={
                        log.level === "error"
                          ? "text-red-400"
                          : log.level === "warn"
                          ? "text-yellow-400"
                          : "text-cyan-300"
                      }
                    >
                      [{log.level}]
                    </span>
                    <span className="text-white">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOM Snapshot */}
          {error.domSnapshot?.detailPanelHTML && (
            <div>
              <div className="text-sm font-medium mb-2 text-white/60">DOM Snapshot</div>
              <pre className="bg-black/50 p-4 rounded-md text-xs overflow-auto max-h-60 text-cyan-300 border border-cyan-500/30">
                {error.domSnapshot.detailPanelHTML.substring(0, 2000)}...
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!error.resolved && (
              <Button
                onClick={() => onMarkResolved(error._id)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Resolved
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(error._id);
                onClose();
              }}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              Delete Error
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
