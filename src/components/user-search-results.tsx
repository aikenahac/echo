"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { followUser, unfollowUser } from "@/app/[locale]/actions/social";
import type { users } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type User = InferSelectModel<typeof users>;

interface UserSearchResultsProps {
  results: User[];
  currentUserFollowing: string[];
  query: string;
}

export function UserSearchResults({
  results,
  currentUserFollowing: initialFollowing,
  query: initialQuery,
}: UserSearchResultsProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [following, setFollowing] = useState<Set<string>>(
    new Set(initialFollowing),
  );
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    router.push(`/users/search?${params.toString()}`);
  };

  const handleFollow = (userId: string) => {
    startTransition(async () => {
      const result = await followUser(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setFollowing((prev) => new Set([...prev, userId]));
        toast.success("Followed user!");
      }
    });
  };

  const handleUnfollow = (userId: string) => {
    startTransition(async () => {
      const result = await unfollowUser(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setFollowing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast.success("Unfollowed user");
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((user) => {
            const isFollowing = following.has(user.id);
            return (
              <div
                key={user.id}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">{user.username || user.email}</p>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {user.bio}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    isFollowing
                      ? handleUnfollow(user.id)
                      : handleFollow(user.id)
                  }
                  disabled={isPending}
                  className={`px-4 py-2 rounded-md text-sm disabled:opacity-50 ${
                    isFollowing
                      ? "border hover:bg-accent"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
        </div>
      ) : query ? (
        <p className="text-center text-muted-foreground py-8">
          No users found. Try a different search term.
        </p>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Enter a username or email to search for users.
        </p>
      )}
    </div>
  );
}
