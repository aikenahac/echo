import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userBooks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LibraryIsland } from "@/components/library-island";

export default async function LibraryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // Fetch all user books with book details
  const allUserBooks = await db.query.userBooks.findMany({
    where: eq(userBooks.userId, userId),
    with: {
      book: true,
    },
    orderBy: (userBooks, { desc }) => [desc(userBooks.createdAt)],
  });

  // Separate books by status
  const wantToRead = allUserBooks.filter((ub) => ub.status === "want");
  const currentlyReading = allUserBooks.filter((ub) => ub.status === "reading");
  const finished = allUserBooks.filter((ub) => ub.status === "finished");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Library</h1>
      <LibraryIsland
        wantToRead={wantToRead}
        currentlyReading={currentlyReading}
        finished={finished}
      />
    </div>
  );
}
