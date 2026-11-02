import { getTranslations } from "next-intl/server";
import type { Audience } from "@/lib/audience";

/** What a hidden part of a profile says, by who it is shared with */
export async function Locked({ audience, name }: { audience: Audience; name: string }) {
  const t = await getTranslations("userProfile");
  // "public" can't be locked; it only reaches here through a race
  const key = audience === "public" ? "private" : audience;
  return (
    <p className="py-10 text-[15px] text-ink-2">{t(`locked.${key}`, { name })}</p>
  );
}
