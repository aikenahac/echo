"use server";

import { auth } from "@clerk/nextjs/server";
import { discordAuthorizeUrl, isDiscordLinkingConfigured, unlinkDiscord } from "@/lib/discord";
import { revalidateLocalized } from "@/lib/revalidate";

/** Discord's consent page for linking the signed-in user's account */
export async function getDiscordConnectUrl(): Promise<{ url: string } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  if (!isDiscordLinkingConfigured()) return { error: "Discord linking is not available" };
  return { url: discordAuthorizeUrl(userId, "web") };
}

export async function disconnectDiscord(): Promise<{ success: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };
  try {
    await unlinkDiscord(userId);
    revalidateLocalized("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error disconnecting Discord:", error);
    return { error: "Could not disconnect Discord" };
  }
}
