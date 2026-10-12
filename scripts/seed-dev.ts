/**
 * Dev seed for the mobile redesign.
 *
 * Fills the local database with a realistic library for one test user, plus a
 * circle of followed readers whose activity shows in the Friends feed and in
 * "From people you follow" on book detail. Books come from Open Library; people
 * are faker-generated (English names and bios).
 *
 * The test user must already exist (sign in once from the app or the web, which
 * provisions the row). Their library, collections, reviews and subscription are
 * replaced, and their name, username and bio are regenerated. Every user this
 * script creates has an id starting with `seed_` and is deleted on the next run.
 *
 * Usage:
 *   pnpm tsx scripts/seed-dev.ts --email you@example.com [--seed 42]
 *
 * Refuses to run against anything but a local database.
 */
import "dotenv/config";
import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, ilike, like, or } from "drizzle-orm";
import * as schema from "../src/db/schema";

const {
  users,
  books,
  userBooks,
  reviews,
  follows,
  collections,
  collectionBooks,
  subscriptionPlans,
  userSubscriptions,
} = schema;

// ---------------------------------------------------------------------------
// Arguments and safety

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const email = arg("email");
const seedArg = arg("seed");

if (!email) {
  console.error(
    "Usage: pnpm tsx scripts/seed-dev.ts --email you@example.com [--seed 42]",
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const dbHost = new URL(databaseUrl).hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(dbHost)) {
  console.error(`Refusing to seed a non-local database (${dbHost})`);
  process.exit(1);
}

if (seedArg) faker.seed(Number(seedArg));

const client = postgres(databaseUrl, { max: 4 });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Books: well-known, well-rated titles. `pages` overrides Open Library's median
// edition length where the design specifies a page count.

type CuratedBook = { title: string; author: string; pages?: number };

const CURATED: CuratedBook[] = [
  // The titles the design is drawn with
  { title: "Piranesi", author: "Susanna Clarke", pages: 245 },
  { title: "Orbital", author: "Samantha Harvey", pages: 136 },
  {
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    pages: 401,
  },
  { title: "James", author: "Percival Everett", pages: 303 },
  { title: "Klara and the Sun", author: "Kazuo Ishiguro", pages: 303 },
  { title: "The Remains of the Day", author: "Kazuo Ishiguro", pages: 245 },
  { title: "Never Let Me Go", author: "Kazuo Ishiguro", pages: 288 },
  {
    title: "An Artist of the Floating World",
    author: "Kazuo Ishiguro",
    pages: 206,
  },
  { title: "Pachinko", author: "Min Jin Lee", pages: 490 },
  { title: "The Secret History", author: "Donna Tartt", pages: 559 },
  { title: "Demon Copperhead", author: "Barbara Kingsolver", pages: 548 },
  { title: "Intermezzo", author: "Sally Rooney", pages: 448 },
  // Classics and modern favourites
  { title: "To Kill a Mockingbird", author: "Harper Lee" },
  { title: "Nineteen Eighty-Four", author: "George Orwell" },
  { title: "Pride and Prejudice", author: "Jane Austen" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
  { title: "One Hundred Years of Solitude", author: "Gabriel García Márquez" },
  { title: "Beloved", author: "Toni Morrison" },
  { title: "The Road", author: "Cormac McCarthy" },
  { title: "Middlemarch", author: "George Eliot" },
  { title: "Jane Eyre", author: "Charlotte Brontë" },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky" },
  { title: "Anna Karenina", author: "Leo Tolstoy" },
  { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky" },
  { title: "Normal People", author: "Sally Rooney" },
  { title: "A Little Life", author: "Hanya Yanagihara" },
  { title: "The Goldfinch", author: "Donna Tartt" },
  { title: "Station Eleven", author: "Emily St. John Mandel" },
  { title: "Circe", author: "Madeline Miller" },
  { title: "The Name of the Wind", author: "Patrick Rothfuss" },
  { title: "Dune", author: "Frank Herbert" },
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin" },
  { title: "Project Hail Mary", author: "Andy Weir" },
  { title: "The Hobbit", author: "J.R.R. Tolkien" },
  { title: "Lonesome Dove", author: "Larry McMurtry" },
  { title: "Rebecca", author: "Daphne du Maurier" },
  { title: "Wolf Hall", author: "Hilary Mantel" },
  { title: "The Overstory", author: "Richard Powers" },
  { title: "Lincoln in the Bardo", author: "George Saunders" },
  { title: "Educated", author: "Tara Westover" },
  { title: "The Book Thief", author: "Markus Zusak" },
  { title: "The Kite Runner", author: "Khaled Hosseini" },
  { title: "A Gentleman in Moscow", author: "Amor Towles" },
  { title: "The Night Circus", author: "Erin Morgenstern" },
  { title: "Cloud Atlas", author: "David Mitchell" },
  { title: "Atonement", author: "Ian McEwan" },
  { title: "The Handmaid's Tale", author: "Margaret Atwood" },
  { title: "Frankenstein", author: "Mary Shelley" },
  { title: "Things Fall Apart", author: "Chinua Achebe" },
];

type OpenLibraryDoc = {
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_publish_year?: number;
};

async function fetchOpenLibrary(
  book: CuratedBook,
): Promise<OpenLibraryDoc | null> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("title", book.title);
  url.searchParams.set("author", book.author);
  url.searchParams.set("limit", "5");
  url.searchParams.set(
    "fields",
    "title,author_name,isbn,cover_i,number_of_pages_median,first_publish_year",
  );
  const res = await fetch(url, {
    headers: { "User-Agent": "EchoDevSeed/1.0 (local development seed)" },
  });
  if (!res.ok) throw new Error(`Open Library ${res.status} for ${book.title}`);
  const data = (await res.json()) as { docs: OpenLibraryDoc[] };
  // Prefer the best-known work that has a cover and a page count
  return (
    data.docs.find((d) => d.cover_i && d.number_of_pages_median) ??
    data.docs.find((d) => d.cover_i) ??
    data.docs[0] ??
    null
  );
}

function pickIsbn(isbns: string[] | undefined) {
  if (!isbns?.length) return null;
  return (
    isbns.find((i) => /^97[89]\d{10}$/.test(i)) ??
    isbns.find((i) => /^\d{9}[\dX]$/.test(i)) ??
    null
  );
}

type SeedBook = typeof books.$inferSelect;

async function upsertBooks(): Promise<Map<string, SeedBook>> {
  const byTitle = new Map<string, SeedBook>();
  const queue = [...CURATED];

  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const doc = await fetchOpenLibrary(next).catch((e) => {
        console.warn(`  ! ${next.title}: ${e.message}`);
        return null;
      });
      if (!doc) continue;

      const values = {
        isbn: pickIsbn(doc.isbn),
        title: next.title,
        author: next.author,
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : null,
        pages: next.pages ?? doc.number_of_pages_median ?? null,
        publishedYear: doc.first_publish_year ?? null,
      };

      const existing = await db.query.books.findFirst({
        where: or(
          values.isbn ? eq(books.isbn, values.isbn) : undefined,
          and(
            ilike(books.title, values.title),
            ilike(books.author, values.author),
          ),
        ),
      });

      let row: SeedBook;
      if (existing) {
        [row] = await db
          .update(books)
          .set({
            author: values.author,
            coverUrl: values.coverUrl ?? existing.coverUrl,
            pages: values.pages ?? existing.pages,
            publishedYear: values.publishedYear ?? existing.publishedYear,
          })
          .where(eq(books.id, existing.id))
          .returning();
      } else {
        [row] = await db.insert(books).values(values).returning();
      }
      byTitle.set(next.title, row);
    }
  }

  await Promise.all([worker(), worker(), worker(), worker()]);
  return byTitle;
}

// ---------------------------------------------------------------------------
// People

/** "First Last", without the prefixes and suffixes fullName() sometimes adds */
const personName = () =>
  `${faker.person.firstName()} ${faker.person.lastName()}`;

function usernameFrom(name: string) {
  const base = faker.internet
    .username({
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(-1)[0],
    })
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
  return base.length >= 3 ? base : `${base}reader`;
}

const takenUsernames = new Set<string>();
function uniqueUsername(name: string) {
  let u = usernameFrom(name);
  while (takenUsernames.has(u))
    u = `${u.slice(0, 26)}${faker.number.int({ min: 1, max: 99 })}`;
  takenUsernames.add(u);
  return u;
}

// faker's lorem is Latin, so reviews are assembled from English sentences
const REVIEW_OPENERS = [
  "I went in expecting to admire this and came out loving it.",
  "Read it in two sittings.",
  "Slow for the first fifty pages, then I couldn't put it down.",
  "Funnier than I expected, and then, suddenly, not funny at all.",
  "This is the kind of book you press into people's hands.",
  "I've been thinking about the ending for a week.",
  "Not every chapter lands, but the ones that do are extraordinary.",
  "A reread, and it holds up better than I remembered.",
  "Gorgeous sentences, and a plot that earns them.",
  "I wanted to like this more than I did.",
];
const REVIEW_MIDDLES = [
  "The structure does something clever without ever showing off.",
  "Every minor character feels like they could carry a novel of their own.",
  "The middle third sags, but the last hundred pages are a gunshot.",
  "It's about grief, mostly, though it never says so.",
  "The narrator understands less than you do, and that's where it hurts.",
  "The prose is plain until it isn't, and then it takes your breath away.",
  "I kept stopping to read paragraphs out loud to whoever was nearby.",
  "There's a scene near the end I'll be carrying around for years.",
];
const REVIEW_CLOSERS = [
  "Docked a star for an ending that explains too much.",
  "Recommended, with a blanket and the lamp on.",
  "I need a week before I start anything else.",
  "Already looking for whatever they wrote next.",
  "Book club is going to argue about this one.",
  "",
];

function reviewText() {
  return [
    faker.helpers.arrayElement(REVIEW_OPENERS),
    faker.helpers.arrayElement(REVIEW_MIDDLES),
    faker.helpers.arrayElement(REVIEW_CLOSERS),
  ]
    .filter(Boolean)
    .join(" ");
}

// ---------------------------------------------------------------------------
// Dates

const now = new Date();
const daysAgo = (d: number, hours = 0) =>
  new Date(now.getTime() - (d * 24 + hours) * 3600_000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
const thisYear = now.getFullYear();
/** A random date this year, between Jan 5 and `beforeDaysAgo` days ago */
function dateThisYear(beforeDaysAgo: number) {
  return faker.date.between({
    from: new Date(thisYear, 0, 5),
    to: daysAgo(beforeDaysAgo),
  });
}

// ---------------------------------------------------------------------------

async function main() {
  const me = await db.query.users.findFirst({ where: eq(users.email, email!) });
  if (!me) {
    console.error(
      `No user with email ${email}. Sign in once from the app to create it.`,
    );
    process.exit(1);
  }

  console.log("Fetching books from Open Library…");
  const catalog = await upsertBooks();
  const book = (title: string) => {
    const b = catalog.get(title);
    if (!b) throw new Error(`Missing seeded book: ${title}`);
    return b;
  };
  console.log(`  ${catalog.size} books ready`);

  console.log("Clearing previous seed data…");
  await db.delete(users).where(like(users.id, "seed\\_%"));
  await db.delete(collections).where(eq(collections.userId, me.id));
  await db.delete(userBooks).where(eq(userBooks.userId, me.id));
  await db.delete(reviews).where(eq(reviews.userId, me.id));
  await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, me.id));

  const existingUsernames = await db.select({ u: users.username }).from(users);
  existingUsernames.forEach(({ u }) => u && takenUsernames.add(u));
  if (me.username) takenUsernames.delete(me.username);

  // --- The test user -------------------------------------------------------
  const myName = personName();
  const [meUpdated] = await db
    .update(users)
    .set({
      displayName: myName,
      username: uniqueUsername(myName),
      bio: faker.person.bio(),
      profilePictureUrl: null,
      updatedAt: now,
    })
    .where(eq(users.id, me.id))
    .returning();

  // Reading 3, Want 7, Finished 23 (19 this year), Favourites 6
  type Entry = typeof userBooks.$inferInsert;
  const mine: Entry[] = [];
  const used = new Set<string>();
  const add = (title: string, e: Omit<Entry, "userId" | "bookId">) => {
    used.add(title);
    const b = book(title);
    mine.push({ userId: me.id, bookId: b.id, pageCount: b.pages ?? 0, ...e });
  };

  add("Piranesi", {
    status: "reading",
    currentPage: 168,
    startedAt: daysAgo(6),
    createdAt: daysAgo(7),
    updatedAt: hoursAgo(0.5),
  });
  add("Orbital", {
    status: "reading",
    currentPage: 41,
    startedAt: daysAgo(4),
    createdAt: daysAgo(12),
    updatedAt: daysAgo(2),
  });
  add("Tomorrow, and Tomorrow, and Tomorrow", {
    status: "reading",
    currentPage: 212,
    startedAt: daysAgo(40),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(21),
  });

  const favourites = new Set([
    "James",
    "Pachinko",
    "The Secret History",
    "The Remains of the Day",
    "Klara and the Sun",
    "Demon Copperhead",
  ]);
  const finishedFixed: [string, number, number | null][] = [
    // title, finished days ago, rating
    ["James", 9, 5],
    ["Klara and the Sun", 18, 4],
    ["Demon Copperhead", 40, 4],
    ["The Remains of the Day", 54, 5],
    ["Pachinko", 74, 5],
    ["The Secret History", 102, null],
    ["Intermezzo", 123, null],
  ];
  for (const [title, ago, rating] of finishedFixed) {
    const length =
      title === "James" ? 11 : faker.number.int({ min: 6, max: 25 });
    add(title, {
      status: "finished",
      currentPage: book(title).pages ?? 0,
      rating,
      isFavorite: favourites.has(title),
      startedAt: daysAgo(ago + length),
      finishedAt: daysAgo(ago),
      createdAt: daysAgo(ago + length + 3),
      updatedAt: daysAgo(ago),
    });
  }

  // Never Let Me Go and An Artist of the Floating World stay out of the
  // library so Search shows them with quick-add capsules
  const reserved = new Set([
    "Never Let Me Go",
    "An Artist of the Floating World",
  ]);
  const pool = faker.helpers.shuffle(
    [...catalog.keys()].filter((t) => !used.has(t) && !reserved.has(t)),
  );

  // 12 more finished this year (19 total), then 4 last year (23 total)
  for (let i = 0; i < 16; i++) {
    const title = pool.shift();
    if (!title) break;
    const finishedAt =
      i < 12
        ? dateThisYear(130)
        : faker.date.past({ years: 1, refDate: new Date(thisYear, 0, 1) });
    const startedAt = new Date(
      finishedAt.getTime() - faker.number.int({ min: 5, max: 30 }) * 86400_000,
    );
    add(title, {
      status: "finished",
      currentPage: book(title).pages ?? 0,
      rating:
        faker.helpers.maybe(() => faker.number.int({ min: 3, max: 5 }), {
          probability: 0.8,
        }) ?? null,
      startedAt,
      finishedAt,
      createdAt: startedAt,
      updatedAt: finishedAt,
    });
  }

  for (let i = 0; i < 7; i++) {
    const title = pool.shift();
    if (!title) break;
    const added = daysAgo(faker.number.int({ min: 3, max: 200 }));
    add(title, {
      status: "want",
      currentPage: 0,
      createdAt: added,
      updatedAt: added,
    });
  }

  const myRows = await db.insert(userBooks).values(mine).returning();
  const myByTitle = new Map(
    myRows.map((r) => [
      [...catalog.entries()].find(([, b]) => b.id === r.bookId)![0],
      r,
    ]),
  );

  // My reviews
  await db.insert(reviews).values([
    {
      userId: me.id,
      bookId: book("James").id,
      content:
        "Funnier than I expected, and then, around page 200, not funny at all. The pencil chapter stays with you.",
      isPrivate: false,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    {
      userId: me.id,
      bookId: book("Klara and the Sun").id,
      content:
        "Ishiguro does the thing again where the narrator understands less than you do, and it hurts more each chapter. Klara's faith in the Sun is the most religious thing I've read this year.\n\nDocked a star for the last thirty pages, which explain too much.",
      isPrivate: false,
      createdAt: daysAgo(17),
      updatedAt: daysAgo(17),
    },
  ]);

  // Collections
  const finishedTitles = [...myByTitle.entries()]
    .filter(([, r]) => r.status === "finished")
    .map(([t]) => t);
  const collectionDefs = [
    {
      name: "Booker 2024 shortlist",
      colorTag: "pink-700",
      iconName: "trophy",
      isPublic: true,
      description: "Reading my way through the shortlist, slowly.",
      titles: [
        "Orbital",
        "James",
        ...finishedTitles.filter((t) => !["James"].includes(t)).slice(0, 2),
      ],
    },
    {
      name: "Ishiguro, all of it",
      colorTag: "zinc-700",
      iconName: "book-open",
      isPublic: true,
      description: null,
      titles: [
        "Klara and the Sun",
        "The Remains of the Day",
        finishedTitles.find(
          (t) => !["Klara and the Sun", "The Remains of the Day"].includes(t),
        )!,
      ],
    },
    {
      name: "Winter rereads",
      colorTag: "teal-700",
      iconName: "snowflake",
      isPublic: false,
      description:
        "Books that are better the second time, with a blanket and the lamp on.",
      titles: [
        "The Secret History",
        "The Remains of the Day",
        "Piranesi",
        "Klara and the Sun",
        "Pachinko",
      ],
    },
  ];
  for (const [i, def] of collectionDefs.entries()) {
    const [c] = await db
      .insert(collections)
      .values({
        userId: me.id,
        name: def.name,
        description: def.description,
        slug: `${def.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(
            /^-|-$/g,
            "",
          )}-${faker.string.alphanumeric(6).toLowerCase()}`,
        colorTag: def.colorTag,
        iconName: def.iconName,
        isPublic: def.isPublic,
        sortOrder: i,
      })
      .returning();
    const ids = def.titles
      .map((t) => myByTitle.get(t)?.id)
      .filter((id): id is string => !!id);
    if (ids.length) {
      await db
        .insert(collectionBooks)
        .values(ids.map((userBookId) => ({ collectionId: c.id, userBookId })));
    }
  }

  // Lifetime Premium
  let plan = await db.query.subscriptionPlans.findFirst({
    where: and(
      eq(subscriptionPlans.name, "Echo Premium"),
      eq(subscriptionPlans.interval, "lifetime"),
    ),
  });
  if (!plan) {
    [plan] = await db
      .insert(subscriptionPlans)
      .values({
        name: "Echo Premium",
        price: 1999,
        interval: "lifetime",
        isInternal: true,
        sortOrder: 10,
      })
      .returning();
  }
  const paidAt = new Date(thisYear, 2, 4);
  await db.insert(userSubscriptions).values({
    userId: me.id,
    planId: plan.id,
    status: "active",
    currentPeriodStart: paidAt,
    createdAt: paidAt,
    updatedAt: paidAt,
  });

  // --- Friends -------------------------------------------------------------
  const FRIENDS = 12;
  const FOLLOWED = 6;
  const friendRows = await db
    .insert(users)
    .values(
      Array.from({ length: FRIENDS }, (_, i) => {
        const name = personName();
        return {
          id: `seed_${faker.string.alphanumeric(24)}`,
          email: `seed.${i}.${faker.string.alphanumeric(6).toLowerCase()}@example.com`,
          displayName:
            faker.helpers.maybe(() => name, { probability: 0.9 }) ?? null,
          username: uniqueUsername(name),
          bio:
            faker.helpers.maybe(() => faker.person.bio(), {
              probability: 0.85,
            }) ?? null,
          createdAt: daysAgo(faker.number.int({ min: 60, max: 400 })),
        };
      }),
    )
    .returning();

  const followed = friendRows.slice(0, FOLLOWED);
  await db
    .insert(follows)
    .values([
      ...followed.map((f) => ({ followerId: me.id, followingId: f.id })),
      ...followed
        .slice(0, 4)
        .map((f) => ({ followerId: f.id, followingId: me.id })),
      ...friendRows
        .slice(FOLLOWED)
        .map((f, i) => ({ followerId: f.id, followingId: friendRows[i].id })),
    ]);

  const allTitles = [...catalog.keys()];
  const friendBooks: Entry[] = [];
  const friendReviews: (typeof reviews.$inferInsert)[] = [];

  for (const [i, f] of friendRows.entries()) {
    const isFollowed = i < FOLLOWED;
    const titles = faker.helpers.arrayElements(allTitles, { min: 4, max: 9 });
    // Two followed friends finish and review James, so its detail has
    // "From people you follow"
    if (i < 2 && !titles.includes("James")) titles.push("James");

    for (const [j, title] of titles.entries()) {
      const b = book(title);
      const total = b.pages ?? 300;
      // Recent activity for followed friends keeps the Friends feed fresh
      const touched =
        isFollowed && j < 2
          ? hoursAgo(faker.number.float({ min: 0.5, max: 96 }))
          : daysAgo(faker.number.int({ min: 5, max: 120 }));
      const status =
        title === "James"
          ? "finished"
          : faker.helpers.weightedArrayElement([
              { weight: 3, value: "finished" as const },
              { weight: 2, value: "reading" as const },
              { weight: 1, value: "want" as const },
            ]);
      const startedAt =
        status === "want"
          ? null
          : new Date(
              touched.getTime() -
                faker.number.int({ min: 3, max: 30 }) * 86400_000,
            );
      friendBooks.push({
        userId: f.id,
        bookId: b.id,
        status,
        currentPage:
          status === "finished"
            ? total
            : status === "reading"
              ? faker.number.int({ min: 1, max: total - 1 })
              : 0,
        pageCount: total,
        rating:
          status === "finished"
            ? (faker.helpers.maybe(() => faker.number.int({ min: 3, max: 5 }), {
                probability: 0.8,
              }) ?? null)
            : null,
        isFavorite: status === "finished" && faker.datatype.boolean(0.3),
        startedAt,
        finishedAt: status === "finished" ? touched : null,
        createdAt: startedAt ?? touched,
        updatedAt: touched,
      });

      if (
        status === "finished" &&
        (title === "James" || faker.datatype.boolean(0.45))
      ) {
        const at = new Date(
          touched.getTime() + faker.number.int({ min: 1, max: 20 }) * 3600_000,
        );
        const when =
          at > now ? hoursAgo(faker.number.float({ min: 0.2, max: 3 })) : at;
        friendReviews.push({
          userId: f.id,
          bookId: b.id,
          content: reviewText(),
          isPrivate: faker.datatype.boolean(0.1),
          createdAt: when,
          updatedAt: when,
        });
      }
    }
  }
  await db.insert(userBooks).values(friendBooks);
  await db.insert(reviews).values(friendReviews);

  // --- Summary -------------------------------------------------------------
  const counts = (s: string) => myRows.filter((r) => r.status === s).length;
  console.log("\nSeeded:");
  console.log(
    `  You: ${meUpdated.displayName} @${meUpdated.username} (${me.email}), lifetime Premium`,
  );
  console.log(
    `  Library: Reading ${counts("reading")} · Want ${counts("want")} · Finished ${counts("finished")} · Favourites ${myRows.filter((r) => r.isFavorite).length}`,
  );
  console.log(`  Collections: ${collectionDefs.map((c) => c.name).join(", ")}`);
  console.log(
    `  Friends: ${friendRows.length} readers, you follow ${followed.length}: ${followed.map((f) => f.displayName ?? f.username).join(", ")}`,
  );
  console.log(
    `  Friend activity: ${friendBooks.length} library entries, ${friendReviews.length} reviews`,
  );
  const missing = CURATED.filter((c) => !catalog.has(c.title)).map(
    (c) => c.title,
  );
  if (missing.length)
    console.log(`  Not found on Open Library: ${missing.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
