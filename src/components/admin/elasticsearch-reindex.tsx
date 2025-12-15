"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  triggerReindex,
  getReindexStatus,
  type ReindexJob,
  type ReindexType,
} from "@/app/[locale]/actions/admin-reindex";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export function ElasticsearchReindex() {
  const [job, setJob] = useState<ReindexJob | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const result = await getReindexStatus();

    if ("error" in result) {
      console.error("Failed to fetch reindex status:", result.error);
      setIsLoading(false);
      return;
    }

    setJob(result);
    setIsLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh every 5 seconds when job is running
  useEffect(() => {
    if (job?.status !== "running") return;

    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [job?.status, fetchStatus]);

  const handleTriggerReindex = async (type: ReindexType) => {
    setIsTriggering(true);

    try {
      const result = await triggerReindex(type);

      if (result.error) {
        toast.error(result.error);
      } else {
        const typeLabels = {
          full: "Full reindex",
          authors: "Authors reindex",
          editions: "Editions reindex",
        };
        toast.success(result.message || `${typeLabels[type]} started successfully`);
        // Refresh status after a moment
        setTimeout(fetchStatus, 1000);
      }
    } catch (error) {
      toast.error("Failed to trigger reindex");
    } finally {
      setIsTriggering(false);
    }
  };

  const getPhaseDisplay = (phase: string | null) => {
    if (!phase) return "";

    const phases: Record<string, string> = {
      recreating_indices: "Recreating indices...",
      indexing_authors: "Indexing authors...",
      indexing_editions: "Indexing editions...",
      refreshing: "Refreshing indices...",
    };

    return phases[phase] || phase;
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return "";

    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const durationMs = endTime - startTime;

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderStats = (job: ReindexJob) => {
    if (job.type === "authors") {
      return (
        <div>
          <p className="text-sm text-muted-foreground">Authors</p>
          <p className="text-2xl font-bold">
            {job.authorsIndexed.toLocaleString()}
            <span className="text-sm text-muted-foreground font-normal">
              {" "}/ {job.totalAuthors.toLocaleString()}
            </span>
          </p>
        </div>
      );
    }

    if (job.type === "editions") {
      return (
        <div>
          <p className="text-sm text-muted-foreground">Editions</p>
          <p className="text-2xl font-bold">
            {job.editionsIndexed.toLocaleString()}
            <span className="text-sm text-muted-foreground font-normal">
              {" "}/ {job.totalEditions.toLocaleString()}
            </span>
          </p>
        </div>
      );
    }

    // Full reindex - show both
    return (
      <>
        <div>
          <p className="text-sm text-muted-foreground">Authors</p>
          <p className="text-2xl font-bold">
            {job.authorsIndexed.toLocaleString()}
            <span className="text-sm text-muted-foreground font-normal">
              {" "}/ {job.totalAuthors.toLocaleString()}
            </span>
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Editions</p>
          <p className="text-2xl font-bold">
            {job.editionsIndexed.toLocaleString()}
            <span className="text-sm text-muted-foreground font-normal">
              {" "}/ {job.totalEditions.toLocaleString()}
            </span>
          </p>
        </div>
      </>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading reindex status...</p>
        </CardContent>
      </Card>
    );
  }

  const isRunning = job?.status === "running";
  const isCompleted = job?.status === "completed";
  const isFailed = job?.status === "failed";
  const noJobs = !job || job.status === "no_jobs";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Elasticsearch Re-index</CardTitle>
            <CardDescription>
              Re-index data from PostgreSQL to Elasticsearch with improved search relevance
            </CardDescription>
          </div>
          {isRunning && (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          )}
          {isCompleted && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          {isFailed && (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {noJobs ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center">
              No reindex jobs found. Choose a reindex option to apply the latest search improvements.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => handleTriggerReindex("full")}
                disabled={isTriggering}
                size="lg"
                className="w-full"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reindex All
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleTriggerReindex("authors")}
                disabled={isTriggering}
                size="lg"
                variant="outline"
                className="w-full"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Authors Only
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleTriggerReindex("editions")}
                disabled={isTriggering}
                size="lg"
                variant="outline"
                className="w-full"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Editions Only
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status and Phase */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isCompleted ? "bg-green-100 text-green-700" :
                  isFailed ? "bg-red-100 text-red-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {job.status.toUpperCase()}
                </span>
              </div>
              {job.currentPhase && (
                <p className="text-sm text-muted-foreground">
                  {getPhaseDisplay(job.currentPhase)}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-3" />
              </div>
            )}

            {/* Stats Grid */}
            <div className={`grid ${job.type === "full" ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
              {renderStats(job)}
            </div>

            {/* Timing */}
            <div className="space-y-1 text-sm">
              {job.startedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span>{format(new Date(job.startedAt), "PPp")}</span>
                </div>
              )}
              {job.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{format(new Date(job.completedAt), "PPp")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">
                  {formatDuration(job.startedAt, job.completedAt)}
                </span>
              </div>
            </div>

            {/* Error */}
            {isFailed && job.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{job.error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {!isRunning && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Start New Reindex:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleTriggerReindex("full")}
                    disabled={isTriggering}
                    className="w-full"
                    variant={isCompleted ? "outline" : "default"}
                  >
                    {isTriggering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reindex All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleTriggerReindex("authors")}
                    disabled={isTriggering}
                    variant="outline"
                    className="w-full"
                  >
                    {isTriggering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Authors Only
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleTriggerReindex("editions")}
                    disabled={isTriggering}
                    variant="outline"
                    className="w-full"
                  >
                    {isTriggering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Editions Only
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="text-xs text-muted-foreground space-y-2">
          <div>
            <p className="font-medium">What does reindexing do?</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Recreates Elasticsearch indices with improved mappings</li>
              <li>Applies quality scoring based on covers, ISBNs, and authors</li>
              <li>Enables multi-field search (title + authors)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Reindex Options:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><strong>All:</strong> ~2-4 hours (authors + editions)</li>
              <li><strong>Authors Only:</strong> ~30 minutes (15M records)</li>
              <li><strong>Editions Only:</strong> ~2-3 hours (55M records)</li>
            </ul>
          </div>
          <p>
            <strong>Note:</strong> PostgreSQL data is not affected, only Elasticsearch indices are recreated.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
