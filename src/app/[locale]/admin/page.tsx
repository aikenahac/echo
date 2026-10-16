import { db } from "@/db";
import { users, books, reviews, userBooks } from "@/db/schema";
import { sql, count, desc, eq } from "drizzle-orm";
import { StatsCard } from "@/components/admin/stats-card";
import { Users, BookOpen, MessageSquare, TrendingUp } from "lucide-react";
import { subDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PopularBooksTable, RecentUsersTable } from "@/components/admin/dashboard-tables";

export default async function AdminDashboard() {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [
    [totalUsers],
    [totalBooks],
    [totalReviews],
    [totalUserBooks],
    [newUsers],
    popularBooks,
    recentUsers,
  ] = await Promise.all([
    // Total counts
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(books),
    db.select({ count: count() }).from(reviews),
    db.select({ count: count() }).from(userBooks),
    // New users last 30 days
    db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo.toISOString()}`),
    // Most popular books (by user_books count)
    db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        userCount: count(userBooks.id),
      })
      .from(books)
      .leftJoin(userBooks, eq(books.id, userBooks.bookId))
      .groupBy(books.id)
      .orderBy(desc(count(userBooks.id)))
      .limit(10),
    // Recent users
    db
      .select({ id: users.id, email: users.email, username: users.username, role: users.role })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(5),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your application statistics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={totalUsers.count}
          icon={Users}
          description={`${newUsers.count} new in last 30 days`}
        />
        <StatsCard
          title="Total Books"
          value={totalBooks.count}
          icon={BookOpen}
          description="Books in catalog"
        />
        <StatsCard
          title="Total Reviews"
          value={totalReviews.count}
          icon={MessageSquare}
          description="User-generated reviews"
        />
        <StatsCard
          title="Books in Libraries"
          value={totalUserBooks.count}
          icon={TrendingUp}
          description="Total user-book relationships"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Books</CardTitle>
            <CardDescription>
              Books added to the most user libraries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PopularBooksTable data={popularBooks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Newest registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentUsersTable data={recentUsers} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
