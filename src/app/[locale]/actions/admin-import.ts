"use server";

import { requireRole } from "@/lib/auth";

export type ImportType = "works" | "editions" | "authors";

export interface ImportJobStatus {
  id: string | null;
  type: string;
  status: "idle" | "running" | "completed" | "failed";
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  progressPercentage: number;
}

/**
 * Trigger import for a specific type via data-source API
 */
export async function triggerImport(type: ImportType) {
  await requireRole(["admin"]);

  const apiUrl = process.env.DATA_SOURCE_API_URL;
  const apiKey = process.env.DATA_SOURCE_API_KEY;

  if (!apiUrl) {
    return { error: "DATA_SOURCE_API_URL is not configured" };
  }

  if (!apiKey) {
    return { error: "DATA_SOURCE_API_KEY is not configured" };
  }

  try {
    const response = await fetch(`${apiUrl}/api/admin/import/${type}`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Import trigger failed:", response.status, errorText);
      return { error: `Failed to trigger import: ${response.statusText}` };
    }

    const data = await response.json();
    return { success: true, message: data.message, status: data.status };
  } catch (error) {
    console.error("Failed to trigger import:", error);
    return { error: "Failed to trigger import" };
  }
}

/**
 * Get import status for a specific type via data-source API
 */
export async function getImportStatus(
  type: ImportType
): Promise<ImportJobStatus | { error: string }> {
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
    const response = await fetch(
      `${apiUrl}/api/admin/import/status/${type}`,
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
        },
        cache: "no-store", // Ensure fresh data
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Get import status failed for ${type}:`, response.status, errorText);
      return { error: `Failed to get import status: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to get import status for ${type}:`, error);
    return { error: `Failed to get import status: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
