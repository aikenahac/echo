import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { linkDiscord, verifyState, type DiscordReturnTo, type LinkResult } from "@/lib/discord";

/** Where to land after Discord's consent page, with the outcome in `?discord=` */
function finish(returnTo: DiscordReturnTo, result: LinkResult | "denied") {
  const target =
    returnTo === "app"
      ? `echo://settings?discord=${result}`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/en/settings?discord=${result}`;
  return NextResponse.redirect(target);
}

/**
 * GET /api/discord/callback
 * OAuth2 redirect for "Connect Discord" (web and app). The signed state names
 * the Echo user who started the flow.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = verifyState(params.get("state") ?? "");
  if (!state) return finish("web", "error");

  const code = params.get("code");
  if (!code) return finish(state.returnTo, "denied");

  // On the web the browser is signed in: it must be the same account
  if (state.returnTo === "web") {
    const { userId } = await auth();
    if (userId !== state.userId) return finish("web", "error");
  }

  return finish(state.returnTo, await linkDiscord(state.userId, code));
}
