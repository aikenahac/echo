import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, follows } from "@/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { UserSearchResults } from "@/components/user-search-results";

export default async function UserSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { userId } = await auth();
  const { q: query } = await searchParams;

  if (!userId) {
    redirect("/sign-in");
  }

  let searchResults: any[] = [];
  let currentUserFollowing: string[] = [];

  // Get current user's following list
  const followingList = await db.query.follows.findMany({
    where: eq(follows.followerId, userId),
  });
  currentUserFollowing = followingList.map((f) => f.followingId);

  if (query && query.trim()) {
    // Search for users by username or email
    searchResults = await db.query.users.findMany({
      where: or(
        ilike(users.username, `%${query}%`),
        ilike(users.email, `%${query}%`)
      ),
      limit: 20,
    });

    // Filter out current user
    searchResults = searchResults.filter((user) => user.id !== userId);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search Users</h1>
      <UserSearchResults
        results={searchResults}
        currentUserFollowing={currentUserFollowing}
        query={query || ""}
      />
    </div>
  );
}
