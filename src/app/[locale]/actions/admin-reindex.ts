"use server";

import { requireRole } from "@/lib/auth";

export type ReindexType = "full" | "authors" | "editions";

export interface ReindexJob {
  id: string;
  type: ReindexType;
  status: "running" | "completed" | "failed" | "no_jobs";
  currentPhase: string | null;
  authorsIndexed: number;
  editionsIndexed: number;
  totalAuthors: number;
  totalEditions: number;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

/**
 * Trigger Elasticsearch reindex
 * @param type - Type of reindex: "full", "authors", or "editions"
 */
export async function triggerReindex(type: ReindexType = "full") {
  try {
    await requireRole(["admin"]);
  } catch (error) {
    return { error: "Unauthorized" };
  }

  const apiUrl = process.env.DATA_SOURCE_API_URL;
  const apiKey = process.env.DATA_SOURCE_API_KEY;

  if (!apiUrl) {
    return { error: "DATA_SOURCE_API_URL is not configured" };
  }

  if (!apiKey) {
    return { error: "DATA_SOURCE_API_KEY is not configured" };
  }

  try {
    // Map type to endpoint
    const endpoint =
      type === "full"
        ? `${apiUrl}/api/admin/reindex`
        : `${apiUrl}/api/admin/reindex/${type}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Reindex trigger failed:", response.status, errorText);
      return { error: `Failed to trigger reindex: ${response.statusText}` };
    }

    const data = await response.json();
    return { success: true, message: data.message, jobId: data.jobId };
  } catch (error) {
    console.error("Failed to trigger reindex:", error);
    return { error: "Failed to trigger reindex" };
  }
}

/**
 * Get Elasticsearch reindex status
 */
export async function getReindexStatus(): Promise<ReindexJob | { error: string }> {
  try {
    await requireRole(["admin"]);
  } catch (error) {
    return { error: "Unauthorized" };
  }

  const apiUrl = process.env.DATA_SOURCE_API_URL;
  const apiKey = process.env.DATA_SOURCE_API_KEY;

  if (!apiUrl) {
    return { error: "DATA_SOURCE_API_URL is not configured" };
  }

  if (!apiKey) {
    return { error: "DATA_SOURCE_API_KEY is not configured" };
  }

  try {
    const response = await fetch(`${apiUrl}/api/admin/reindex/status`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Get reindex status failed:", response.status, errorText);
      return { error: `Failed to get reindex status: ${response.statusText}` };
    }

    const data = await response.json();

    // Handle "no_jobs" status
    if (data.status === "no_jobs") {
      return {
        id: "",
        type: "full" as ReindexType,
        status: "no_jobs",
        currentPhase: null,
        authorsIndexed: 0,
        editionsIndexed: 0,
        totalAuthors: 0,
        totalEditions: 0,
        progress: 0,
        startedAt: null,
        completedAt: null,
        error: null,
      };
    }

    return data;
  } catch (error) {
    console.error("Failed to get reindex status:", error);
    return { error: `Failed to get reindex status: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
