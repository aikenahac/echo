import { redirect } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Heart, Settings } from "lucide-react";
import { ProfileStats } from "@/components/profile-stats";
import { EditProfileForm } from "@/components/edit-profile-form";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { getViewer, isPaidPlan } from "@/lib/auth";
import { getProfileShelves, getYearStats } from "@/lib/reading-stats";

// Shelves are 2-6 columns wide inside a max-w-4xl (896px) container
const SHELF_COVER_SIZES = "(min-width: 1024px) 140px, (min-width: 768px) 33vw, 50vw";
const FAVORITE_COVER_SIZES =
  "(min-width: 1024px) 140px, (min-width: 768px) 20vw, (min-width: 640px) 25vw, 33vw";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  // Cached per request (already loaded by the layout)
  const user = await getViewer();

  if (!user) {
    redirect("/");
  }

  const userId = user.id;

  // Check if user has a paid plan to show settings link
  const hasPaidPlan = isPaidPlan(user.subscription?.plan);

  const [yearStats, { favorites: favoriteBooks, currentlyReading, recentlyFinished }] =
    await Promise.all([getYearStats(userId), getProfileShelves(userId)]);

  const booksThisYear = yearStats.booksFinishedThisYear;
  const totalPages = yearStats.pagesReadThisYear;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {user.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.displayName || user.username || "Profile"}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <span className="text-3xl font-semibold">
                  {(user.displayName || user.username || user.email)?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {user.displayName || user.username || t("title")}
              </h1>
              {user.displayName && user.username && (
                <p className="text-muted-foreground mb-1">@{user.username}</p>
              )}
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          {hasPaidPlan && (
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          )}
        </div>

        <ProfileStats
          booksThisYear={booksThisYear}
          totalPages={totalPages}
          currentStreak={0} // TODO: Calculate reading streak
        />

        <EditProfileForm user={user} />

        {favoriteBooks.length > 0 && (
          <div className="border-2 border-primary/20 rounded-lg p-6 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="h-6 w-6 fill-primary text-primary" />
              <h2 className="text-3xl font-bold">
                {t("shelves.favorites")}
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {favoriteBooks.map((userBook) => (
                <div key={userBook.id}>
                  <Link
                    href={`/books/${userBook.bookId}`}
                    className="block relative aspect-[2/3] group"
                  >
                    {userBook.book.coverUrl ? (
                      <Image
                        src={userBook.book.coverUrl}
                        alt={userBook.book.title}
                        fill
                        sizes={FAVORITE_COVER_SIZES}
                        className="rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/80 transition-colors">
                        {t("shelves.noCover")}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentlyReading.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {t("shelves.currentlyReading")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {currentlyReading.map((userBook) => (
                <div key={userBook.id}>
                  <Link
                    href={`/books/${userBook.bookId}`}
                    className="block relative aspect-[2/3]"
                  >
                    {userBook.book.coverUrl ? (
                      <Image
                        src={userBook.book.coverUrl}
                        alt={userBook.book.title}
                        fill
                        sizes={SHELF_COVER_SIZES}
                        className="rounded shadow hover:opacity-90 transition-opacity object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground hover:opacity-90 transition-opacity">
                        {t("shelves.noCover")}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentlyFinished.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              {t("shelves.recentlyFinished")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentlyFinished.map((userBook) => (
                <div key={userBook.id}>
                  <Link
                    href={`/books/${userBook.bookId}`}
                    className="block relative aspect-[2/3]"
                  >
                    {userBook.book.coverUrl ? (
                      <Image
                        src={userBook.book.coverUrl}
                        alt={userBook.book.title}
                        fill
                        sizes={SHELF_COVER_SIZES}
                        className="rounded shadow hover:opacity-90 transition-opacity object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground hover:opacity-90 transition-opacity">
                        {t("shelves.noCover")}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
