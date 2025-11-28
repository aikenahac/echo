import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { db } from "@/db";
import { users, userBooks } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { ProfileStats } from "@/components/profile-stats";
import { EditProfileForm } from "@/components/edit-profile-form";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Ensure user exists in database
  await db
    .insert(users)
    .values({
      id: userId,
      email: "", // Will be updated from Clerk webhook
    })
    .onConflictDoNothing();

  // Fetch user profile
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Get current year start date
  const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

  // Fetch reading stats
  const finishedBooks = await db.query.userBooks.findMany({
    where: and(
      eq(userBooks.userId, userId),
      eq(userBooks.status, "finished")
    ),
    with: {
      book: true,
    },
  });

  const booksThisYear = finishedBooks.filter(
    (ub) => ub.finishedAt && new Date(ub.finishedAt) >= currentYearStart
  );

  const totalPages = booksThisYear.reduce(
    (sum, ub) => sum + (ub.book.pages || 0),
    0
  );

  // Fetch currently reading books
  const currentlyReading = await db.query.userBooks.findMany({
    where: and(eq(userBooks.userId, userId), eq(userBooks.status, "reading")),
    with: {
      book: true,
    },
    limit: 6,
  });

  // Fetch recently finished books
  const recentlyFinished = finishedBooks
    .sort((a, b) => {
      const dateA = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const dateB = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 6);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <ProfileStats
          booksThisYear={booksThisYear.length}
          totalPages={totalPages}
          currentStreak={0} // TODO: Calculate reading streak
        />

        <EditProfileForm user={user} />

        {currentlyReading.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Currently Reading</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {currentlyReading.map((userBook) => (
                <div key={userBook.id}>
                  <a href={`/books/${userBook.bookId}`} className="block relative aspect-[2/3]">
                    {userBook.book.coverUrl ? (
                      <Image
                        src={userBook.book.coverUrl}
                        alt={userBook.book.title}
                        fill
                        className="rounded shadow hover:opacity-90 transition-opacity object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground hover:opacity-90 transition-opacity">
                        No cover
                      </div>
                    )}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentlyFinished.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Recently Finished</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentlyFinished.map((userBook) => (
                <div key={userBook.id}>
                  <a href={`/books/${userBook.bookId}`} className="block relative aspect-[2/3]">
                    {userBook.book.coverUrl ? (
                      <Image
                        src={userBook.book.coverUrl}
                        alt={userBook.book.title}
                        fill
                        className="rounded shadow hover:opacity-90 transition-opacity object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground hover:opacity-90 transition-opacity">
                        No cover
                      </div>
                    )}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
