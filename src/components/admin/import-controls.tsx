"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  triggerImport,
  getImportStatus,
  type ImportType,
  type ImportJobStatus,
} from "@/app/[locale]/actions/admin-import";
import { toast } from "sonner";
import { Loader2, Download, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

export function ImportControls() {
  const [loading, setLoading] = useState<ImportType | null>(null);
  const [statuses, setStatuses] = useState<Record<ImportType, ImportJobStatus | null>>({
    authors: null,
    works: null,
    editions: null,
  });

  const fetchStatuses = useCallback(async () => {
    const types: ImportType[] = ["authors", "works", "editions"];
    const newStatuses: Record<ImportType, ImportJobStatus | null> = {
      authors: null,
      works: null,
      editions: null,
    };

    for (const type of types) {
      const result = await getImportStatus(type);
      // Check if it's an error response (has only "error" field) vs ImportJobStatus (has "status" field)
      if ("status" in result) {
        newStatuses[type] = result;
      } else {
        console.error(`Failed to fetch ${type} status:`, result.error);
      }
    }

    setStatuses(newStatuses);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Auto-refresh every 15 seconds if any import is running
  useEffect(() => {
    const hasRunningImport = Object.values(statuses).some(
      (status) => status?.status === "running"
    );

    if (!hasRunningImport) return;

    const interval = setInterval(fetchStatuses, 15000);
    return () => clearInterval(interval);
  }, [statuses, fetchStatuses]);

  const handleTrigger = async (type: ImportType) => {
    setLoading(type);

    try {
      const result = await triggerImport(type);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message || `${type} import started successfully`);
        // Refresh status after starting
        setTimeout(fetchStatuses, 1000);
      }
    } catch (error) {
      toast.error("Failed to trigger import");
    } finally {
      setLoading(null);
    }
  };

  const importTypeLabels: Record<ImportType, { title: string; description: string; size: string }> = {
    authors: {
      title: "Authors",
      description: "Import author data from OpenLibrary",
      size: "~500MB compressed",
    },
    works: {
      title: "Works",
      description: "Import work/book metadata",
      size: "~3.5GB compressed",
    },
    editions: {
      title: "Editions",
      description: "Import all book editions (largest dataset)",
      size: "~45GB compressed",
    },
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Imports run in the background and can take several hours (editions may take 12-24 hours).
          Make sure the data-source server has sufficient disk space and resources.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Manual Import Triggers</CardTitle>
          <CardDescription>
            Trigger data imports from OpenLibrary dumps. These will download, parse, and index data into both PostgreSQL and Elasticsearch.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {(["authors", "works", "editions"] as ImportType[]).map((type) => {
            const status = statuses[type];
            const isRunning = status?.status === "running";
            const isCompleted = status?.status === "completed";
            const isFailed = status?.status === "failed";

            return (
              <Card key={type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{importTypeLabels[type].title}</CardTitle>
                    {isRunning && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {isCompleted && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {isFailed && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {importTypeLabels[type].description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Size: {importTypeLabels[type].size}
                  </p>

                  {/* Progress bar */}
                  {status && (isRunning || isCompleted) && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {isRunning ? "In Progress" : "Completed"}
                        </span>
                        <span>{status.progressPercentage}%</span>
                      </div>
                      <Progress value={status.progressPercentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        <div>Processed: {status.recordsProcessed.toLocaleString()}</div>
                        <div>Inserted: {status.recordsInserted.toLocaleString()}</div>
                        <div>Updated: {status.recordsUpdated.toLocaleString()}</div>
                        {status.startedAt && (
                          <div className="mt-1">
                            Started: {format(new Date(status.startedAt), "MMM d, HH:mm")}
                          </div>
                        )}
                        {status.completedAt && (
                          <div>
                            Completed: {format(new Date(status.completedAt), "MMM d, HH:mm")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {isFailed && status?.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {status.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={() => handleTrigger(type)}
                    disabled={loading !== null || isRunning}
                    className="w-full"
                    variant={type === "editions" ? "default" : "outline"}
                  >
                    {loading === type ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        {isCompleted ? "Re-import" : "Import"} {importTypeLabels[type].title}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Recommended Import Order</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Authors first (required for resolving author names in editions)</li>
            <li>Works second (metadata about books)</li>
            <li>Editions last (references authors and works)</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
