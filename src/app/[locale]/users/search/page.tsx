import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, follows } from "@/db/schema";
import { eq, or, ilike, and, ne } from "drizzle-orm";
import { UserSearchResults } from "@/components/user-search-results";
import { getTranslations } from "next-intl/server";
import { publicUserColumns } from "@/lib/public-user";
import { escapeLike } from "@/lib/utils";

export default async function UserSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const t = await getTranslations("usersSearch");
  const { userId } = await auth();
  const { q } = await searchParams;
  const query = q?.trim() || "";

  if (!userId) {
    redirect("/");
  }

  const [followingList, searchResults] = await Promise.all([
    // Get current user's following list
    db.query.follows.findMany({
      where: eq(follows.followerId, userId),
      columns: { followingId: true },
    }),
    // Search for other users by username or display name
    query
      ? db.query.users.findMany({
          where: and(
            ne(users.id, userId),
            or(
              ilike(users.username, `%${escapeLike(query)}%`),
              ilike(users.displayName, `%${escapeLike(query)}%`),
            ),
          ),
          columns: { ...publicUserColumns, bio: true },
          limit: 20,
        })
      : [],
  ]);

  const currentUserFollowing = followingList.map((f) => f.followingId);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>
      <UserSearchResults
        // Reset the search input when the URL query changes (e.g. back/forward)
        key={query}
        results={searchResults}
        currentUserFollowing={currentUserFollowing}
        query={query}
      />
    </div>
  );
}
