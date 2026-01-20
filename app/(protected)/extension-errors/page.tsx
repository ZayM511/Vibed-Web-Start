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
  TrendingUp,
  Clock,
  Code,
  MapPin,
  ExternalLink,
} from "lucide-react";

type Platform = "linkedin" | "indeed" | "google";

export default function ExtensionErrorsPage() {
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
      resolvedBy: "admin",
      notes: "Marked as resolved from dashboard",
    });
  };

  const handleDelete = async (id: Id<"extensionErrors">) => {
    await deleteError({ id });
    if (selectedError === id) {
      setSelectedError(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Extension Error Monitoring</h1>
        <p className="text-muted-foreground">
          Real-time error tracking for JobFiltr Chrome Extension
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.last24Hours || 0}</div>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unresolved || 0}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.last7Days || 0}</div>
            <p className="text-xs text-muted-foreground">Weekly trend</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Errors by Platform</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">LinkedIn</div>
            <div className="text-2xl font-bold">{stats?.byPlatform.linkedin || 0}</div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Indeed</div>
            <div className="text-2xl font-bold">{stats?.byPlatform.indeed || 0}</div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Google</div>
            <div className="text-2xl font-bold">{stats?.byPlatform.google || 0}</div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={selectedPlatform === undefined ? "default" : "outline"}
          onClick={() => setSelectedPlatform(undefined)}
          size="sm"
        >
          All Platforms
        </Button>
        <Button
          variant={selectedPlatform === "linkedin" ? "default" : "outline"}
          onClick={() => setSelectedPlatform("linkedin")}
          size="sm"
        >
          LinkedIn
        </Button>
        <Button
          variant={selectedPlatform === "indeed" ? "default" : "outline"}
          onClick={() => setSelectedPlatform("indeed")}
          size="sm"
        >
          Indeed
        </Button>
        <Button
          variant={selectedPlatform === "google" ? "default" : "outline"}
          onClick={() => setSelectedPlatform("google")}
          size="sm"
        >
          Google
        </Button>
        <div className="ml-auto">
          <Button
            variant={showResolved ? "default" : "outline"}
            onClick={() => setShowResolved(!showResolved)}
            size="sm"
          >
            {showResolved ? "Showing All" : "Hide Resolved"}
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="grouped" className="w-full">
        <TabsList>
          <TabsTrigger value="grouped">Grouped Errors</TabsTrigger>
          <TabsTrigger value="individual">Individual Errors</TabsTrigger>
        </TabsList>

        {/* Grouped Errors */}
        <TabsContent value="grouped" className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {groupedErrors?.map((group: any) => (
            <Card key={group.message} className={group.resolved ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      {group.errorType}
                    </CardTitle>
                    <CardDescription className="mt-1">{group.message}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={group.resolved ? "secondary" : "destructive"}>
                      {group.count} occurrence{group.count > 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="outline">{group.platform}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
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
        <TabsContent value="individual" className="space-y-4">
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

      {/* Error Details Modal/Panel */}
      {selectedErrorData && (
        <ErrorDetailsPanel
          error={selectedErrorData}
          onClose={() => setSelectedError(null)}
          onMarkResolved={handleMarkResolved}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// Error Card Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ErrorCard({ error, onMarkResolved, onDelete, onViewDetails }: any) {
  return (
    <Card className={error.resolved ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-4 w-4" />
              {error.errorType}
            </CardTitle>
            <CardDescription className="mt-1">{error.message}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={error.resolved ? "secondary" : "destructive"}>
              {error.resolved ? "Resolved" : "Active"}
            </Badge>
            <Badge variant="outline">{error.platform}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            View Full Details
          </Button>
          {!error.resolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkResolved(error._id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Resolved
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(error._id)}
            className="text-destructive"
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {error.errorType}
              </CardTitle>
              <CardDescription className="mt-2">{error.message}</CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Platform</div>
              <Badge variant="outline">{error.platform}</Badge>
            </div>
            <div>
              <div className="text-sm font-medium">Status</div>
              <Badge variant={error.resolved ? "secondary" : "destructive"}>
                {error.resolved ? "Resolved" : "Active"}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium">Timestamp</div>
              <div className="text-sm">{new Date(error.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Extension Version</div>
              <div className="text-sm">{error.extensionVersion}</div>
            </div>
          </div>

          {/* URL */}
          <div>
            <div className="text-sm font-medium mb-2">URL</div>
            <a
              href={error.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center gap-1"
            >
              {error.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Job Context */}
          {error.jobContext && (
            <div>
              <div className="text-sm font-medium mb-2">Job Context</div>
              <div className="text-sm space-y-1">
                {error.jobContext.jobTitle && <div>Title: {error.jobContext.jobTitle}</div>}
                {error.jobContext.company && <div>Company: {error.jobContext.company}</div>}
                {error.jobContext.jobId && <div>Job ID: {error.jobContext.jobId}</div>}
              </div>
            </div>
          )}

          {/* Stack Trace */}
          {error.stack && (
            <div>
              <div className="text-sm font-medium mb-2">Stack Trace</div>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60">
                {error.stack}
              </pre>
            </div>
          )}

          {/* Console Logs */}
          {error.consoleLogs && error.consoleLogs.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">
                Console Logs ({error.consoleLogs.length})
              </div>
              <div className="bg-muted p-4 rounded-md space-y-1 text-xs max-h-60 overflow-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {error.consoleLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-muted-foreground">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span
                      className={
                        log.level === "error"
                          ? "text-red-500"
                          : log.level === "warn"
                          ? "text-yellow-500"
                          : ""
                      }
                    >
                      [{log.level}]
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOM Snapshot */}
          {error.domSnapshot?.detailPanelHTML && (
            <div>
              <div className="text-sm font-medium mb-2">DOM Snapshot</div>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60">
                {error.domSnapshot.detailPanelHTML.substring(0, 2000)}...
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!error.resolved && (
              <Button onClick={() => onMarkResolved(error._id)}>
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
            >
              Delete Error
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
