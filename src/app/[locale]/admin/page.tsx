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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminDashboard() {
  // Total counts
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalBooks] = await db.select({ count: count() }).from(books);
  const [totalReviews] = await db.select({ count: count() }).from(reviews);
  const [totalUserBooks] = await db
    .select({ count: count() })
    .from(userBooks);

  // New users last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const [newUsers] = await db
    .select({ count: count() })
    .from(users)
    .where(sql`${users.createdAt} >= ${thirtyDaysAgo.toISOString()}`);

  // Most popular books (by user_books count)
  const popularBooks = await db
    .select({
      book: books,
      userCount: count(userBooks.id),
    })
    .from(books)
    .leftJoin(userBooks, eq(books.id, userBooks.bookId))
    .groupBy(books.id)
    .orderBy(desc(count(userBooks.id)))
    .limit(10);

  // Recent users
  const recentUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5);

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {popularBooks.map((item) => (
                  <TableRow key={item.book.id}>
                    <TableCell className="font-medium">
                      {item.book.title}
                    </TableCell>
                    <TableCell>{item.book.author}</TableCell>
                    <TableCell className="text-right">
                      {item.userCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Newest registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.username || "—"}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {user.role}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
