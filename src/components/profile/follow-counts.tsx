import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * "34 followers · 20 following" under a profile header; each opens its list
 * under `base`, or stays plain text when the lists are hidden (null)
 */
export async function FollowCounts({
  base,
  followerCount,
  followingCount,
  className,
}: {
  base: string | null;
  followerCount: number;
  followingCount: number;
  className?: string;
}) {
  const t = await getTranslations("userProfile");
  const followers = t("followers", { count: followerCount });
  const following = t("followingCount", { count: followingCount });
  const link = "hover:text-ink hover:underline";
  return (
    <p className={cn("text-[15px] text-ink-2 tnum", className)}>
      {base ? (
        <>
          <Link href={`${base}/followers`} className={link}>{followers}</Link>
          {" · "}
          <Link href={`${base}/following`} className={link}>{following}</Link>
        </>
      ) : (
        <>
          {followers} · {following}
        </>
      )}
    </p>
  );
}
