import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isPaidPlan } from "@/lib/plans";

/**
 * Discord community server: staff signup alerts, account linking and the
 * roles that follow from it (Echo Member when linked, Premium while paid).
 *
 * Every call is best-effort: without DISCORD_BOT_TOKEN nothing is sent, and
 * a Discord outage is logged, never thrown into the request that caused it.
 */

const API = "https://discord.com/api/v10";

const botToken = () => process.env.DISCORD_BOT_TOKEN;
const guildId = () => process.env.DISCORD_GUILD_ID;
const premiumRoleId = () => process.env.DISCORD_PREMIUM_ROLE_ID;
const memberRoleId = () => process.env.DISCORD_MEMBER_ROLE_ID;

async function discordApi(path: string, init: RequestInit = {}) {
  const token = botToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    // 404: the member left the server (or the role/channel is gone)
    if (!res.ok && res.status !== 404) {
      console.error(`Discord ${init.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`);
    }
    return res;
  } catch (error) {
    console.error(`Discord ${init.method ?? "GET"} ${path} failed:`, error);
    return null;
  }
}

// --- Signup alerts -------------------------------------------------------

export type SignupPlatform = "web" | "app";

/** Post a new member to the staff-only signups channel */
export async function notifySignup({ email, platform }: { email: string; platform: SignupPlatform }) {
  const channelId = process.env.DISCORD_SIGNUPS_CHANNEL_ID;
  if (!channelId || !botToken()) return;
  try {
    const [{ total }] = await db.select({ total: count() }).from(users);
    await discordApi(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [
          {
            title: "New member",
            color: 0xf05a8c,
            fields: [
              { name: "Email", value: email || "—", inline: true },
              { name: "Via", value: platform === "app" ? "Mobile app" : "Web", inline: true },
              { name: "Member", value: `#${total}`, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
        allowed_mentions: { parse: [] },
      }),
    });
  } catch (error) {
    console.error("Discord signup notification failed:", error);
  }
}

// --- Roles ---------------------------------------------------------------

async function setRole(discordUserId: string, roleId: string | undefined, on: boolean) {
  const guild = guildId();
  if (!guild || !roleId) return;
  await discordApi(`/guilds/${guild}/members/${discordUserId}/roles/${roleId}`, {
    method: on ? "PUT" : "DELETE",
  });
}

type SubscriptionRow = { status: string; plan: Parameters<typeof isPaidPlan>[0] } | null | undefined;

/** Every user has an active free-plan row; only an active paid row is Premium */
export const holdsPremium = (sub: SubscriptionRow) =>
  !!sub && (sub.status === "active" || sub.status === "trialing") && isPaidPlan(sub.plan);

const findLinkedUser = (userId: string) =>
  db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { discordUserId: true },
    with: { subscription: { with: { plan: true } } },
  });

/** Give or take the Premium role to match the user's plan (no-op when not linked) */
export async function syncDiscordPremium(userId: string) {
  try {
    const user = await findLinkedUser(userId);
    if (!user?.discordUserId) return;
    await setRole(user.discordUserId, premiumRoleId(), holdsPremium(user.subscription));
  } catch (error) {
    console.error("Discord premium sync failed:", error);
  }
}

/** Sync the Premium role once the current request has responded */
export function queueDiscordPremiumSync(userId: string) {
  if (!botToken()) return;
  after(() => syncDiscordPremium(userId));
}

/** Remove every role Echo hands out (unlinking, account deletion) */
export async function removeDiscordRoles(discordUserId: string) {
  await setRole(discordUserId, premiumRoleId(), false);
  await setRole(discordUserId, memberRoleId(), false);
}

// --- Account linking (OAuth2) -------------------------------------------

export type DiscordReturnTo = "web" | "app";

const STATE_TTL_MS = 10 * 60 * 1000;

export function isDiscordLinkingConfigured() {
  return !!(
    process.env.DISCORD_CLIENT_ID &&
    process.env.DISCORD_CLIENT_SECRET &&
    botToken() &&
    guildId()
  );
}

const redirectUri = () => `${process.env.NEXT_PUBLIC_BASE_URL}/api/discord/callback`;

const hmac = (body: string, secret: string) =>
  createHmac("sha256", secret).update(body).digest("base64url");

/** Sign the OAuth state so the callback knows which Echo user started the link */
export function signState(
  userId: string,
  returnTo: DiscordReturnTo,
  secret = process.env.DISCORD_CLIENT_SECRET ?? "",
  now = Date.now(),
) {
  const body = Buffer.from(
    JSON.stringify({ u: userId, r: returnTo, e: now + STATE_TTL_MS, n: randomBytes(8).toString("base64url") }),
  ).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

export function verifyState(
  state: string,
  secret = process.env.DISCORD_CLIENT_SECRET ?? "",
  now = Date.now(),
): { userId: string; returnTo: DiscordReturnTo } | null {
  if (!secret) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(hmac(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(body, "base64url").toString());
    if (
      typeof data !== "object" || data === null ||
      !("u" in data) || typeof data.u !== "string" ||
      !("r" in data) || (data.r !== "web" && data.r !== "app") ||
      !("e" in data) || typeof data.e !== "number" || data.e < now
    ) {
      return null;
    }
    return { userId: data.u, returnTo: data.r };
  } catch {
    return null;
  }
}

/** Discord's consent page; `guilds.join` lets the bot add the user to the server */
export function discordAuthorizeUrl(userId: string, returnTo: DiscordReturnTo) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: "identify guilds.join",
    state: signState(userId, returnTo),
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

async function exchangeCode(code: string) {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: process.env.DISCORD_CLIENT_ID ?? "",
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status}`);
  const data: { access_token?: unknown } = await res.json();
  if (typeof data.access_token !== "string") throw new Error("Discord token missing");
  return data.access_token;
}

async function fetchDiscordUserId(accessToken: string) {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord user lookup failed: ${res.status}`);
  const data: { id?: unknown } = await res.json();
  if (typeof data.id !== "string") throw new Error("Discord user id missing");
  return data.id;
}

/** Add the member to the server (or update an existing member) with their roles */
async function joinGuild(discordUserId: string, accessToken: string, premium: boolean) {
  const guild = guildId();
  if (!guild) return;
  const roles = [memberRoleId(), premium ? premiumRoleId() : undefined].filter(
    (r): r is string => !!r,
  );
  const res = await discordApi(`/guilds/${guild}/members/${discordUserId}`, {
    method: "PUT",
    body: JSON.stringify({ access_token: accessToken, roles }),
  });
  // 204: already a member, and Discord ignores `roles` then
  if (res?.status === 204) {
    await setRole(discordUserId, memberRoleId(), true);
    await setRole(discordUserId, premiumRoleId(), premium);
  }
}

export type LinkResult = "linked" | "taken" | "error";

/** Finish the OAuth flow: store the Discord id, join the server, hand out roles */
export async function linkDiscord(userId: string, code: string): Promise<LinkResult> {
  try {
    const accessToken = await exchangeCode(code);
    const discordUserId = await fetchDiscordUserId(accessToken);

    const owner = await db.query.users.findFirst({
      where: and(eq(users.discordUserId, discordUserId), ne(users.id, userId)),
      columns: { id: true },
    });
    if (owner) return "taken";

    const user = await findLinkedUser(userId);
    if (!user) return "error";
    if (user.discordUserId && user.discordUserId !== discordUserId) {
      await removeDiscordRoles(user.discordUserId);
    }

    await db
      .update(users)
      .set({ discordUserId, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await joinGuild(discordUserId, accessToken, holdsPremium(user.subscription));
    return "linked";
  } catch (error) {
    console.error("Discord link failed:", error);
    return "error";
  }
}

export async function unlinkDiscord(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { discordUserId: true },
  });
  if (!user?.discordUserId) return;
  await removeDiscordRoles(user.discordUserId);
  await db
    .update(users)
    .set({ discordUserId: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
