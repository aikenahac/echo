# Echo — Product & API Handoff for the Mobile App

This document describes everything the Echo web app does today, so a mobile app can be designed and built against the same backend. It covers the product (screens, flows, rules), the data model, and the REST API the mobile app will call, including the gaps where the API doesn't yet cover what the web app does.

Source of truth: the code in this repo as of the `feat/mobile-api-parity` branch (October 2026).

---

## 1. What Echo is

**Echo** ("Echo Reads", domain `echobook.club`) is a social reading tracker, positioned as a Goodreads alternative. Users:

- Keep a personal **library** of books, each on one of three shelves: **Want to Read**, **Currently Reading**, **Finished**.
- Mark books as **favorites**.
- Track **reading progress** page by page.
- **Rate** books from 1 to 5 stars and write **reviews**, which can be public or private.
- **Follow** other readers and see their activity in a **feed**.
- With **Premium**, organize books into custom **collections** with a color, icon, cover image and public/private visibility.

Tech behind it: Next.js 16, PostgreSQL + Drizzle, **Clerk** for auth, **Stripe** for payments, **AWS S3** for image uploads, **Open Library** as the external book catalog, **Resend** for transactional email. The UI is English only today, but every string goes through `next-intl`, so a mobile app should plan for localization from the start.

---

## 2. Core concepts and IDs (read this first)

There are **two kinds of book ID**, and mixing them up is the most likely source of bugs:

| Concept | Table | ID | What it is |
|---|---|---|---|
| **Book** (catalog entry) | `books` | `book.id` (UUID) | A shared catalog entry: title, author, ISBN, cover, pages, year. The same row is shared by every user. |
| **UserBook** (library entry) | `user_books` | `userBook.id` (UUID) | One user's copy of a book: status, current page, page count, rating, favorite flag, start and finish dates. |

- **Every `/api/v1/books/{id}/…` endpoint takes the `userBook.id`**, not the catalog `book.id`.
- **Reviews are keyed by the catalog `book.id`.**
- **Collections contain `userBook.id`s.**
- The web app's book detail page (`/books/{id}`) uses the **catalog** `book.id`; its API counterpart is `GET /api/v1/catalog/{bookId}`.

A user can have a given book in their library **only once** (enforced by a unique constraint on user + book).

---

## 3. Users, authentication and onboarding

### Authentication
- Sign-in and sign-up are handled entirely by **Clerk** (email, OAuth and so on, depending on the Clerk dashboard configuration). On mobile, use `@clerk/clerk-expo` (React Native) or the native Clerk SDKs.
- The API accepts a **Clerk session JWT** in `Authorization: Bearer <token>`. The server verifies it with Clerk. Cookie sessions also work, but they're for the web.
- **Lazy provisioning:** the first authenticated API call for a new Clerk user creates their `users` row (email from Clerk) and assigns the **Free** plan. No separate "register" call is needed.

### User profile fields
| Field | Rules |
|---|---|
| `username` | Required to use the app. 3–30 characters, only `a-z A-Z 0-9 _ .`, unique. |
| `displayName` | Optional, up to 100 characters. |
| `bio` | Optional, up to 1000 characters. |
| `profilePictureUrl` | Optional. Must be an image the user uploaded through the presigned S3 flow (see §6, Image uploads). |
| `email` | Comes from Clerk. Never exposed to other users. |
| `role` | `user`, `moderator` or `admin`. Admin and moderator only matter for the web admin panel. |

### Mandatory username setup
New users have no username. The web app shows a **non-dismissible dialog** on every page until a username is set. The input strips invalid characters as the user types and validates the length. **The mobile app needs the same blocking onboarding step** right after the first sign-in: check `GET /api/v1/profile` → `username === null`. Validate as the user types with `GET /api/v1/profile/username-available?username=`, then save with `PUT /api/v1/profile { username }`.

### Name display convention
Show `displayName`, with `@username` beneath it when both exist. Otherwise show `username`. Avatar fallback: the first letter of displayName, username or email, on a muted circle.

---

## 4. Feature walkthrough (screen by screen)

The web navigation for signed-in users: **Search · Library · Feed · Find Users · Profile · Premium** (Premium only shows for non-paying users; paying users reach **Settings** from their profile instead) · **Admin** (moderators and admins only). Signed-out users see **Pricing** and **Sign in**.

A natural mobile tab bar: **Library · Search · Feed · Profile**, with Find Users reached from Feed or Search, and Premium and Settings reached from Profile.

### 4.1 Home
- **Signed out:** a landing page with "Welcome to Echo" and three feature tiles: *Track Your Reading*, *Connect with Readers*, *Achieve Your Goals*.
- **Signed in:** "Welcome back!" plus four quick-link cards: My Library, Search Books, Activity Feed, My Profile. On mobile this is probably replaced by the tab bar.

### 4.2 Book search (hybrid search)
- A single text field; the user submits a query.
- **How results are found:**
  1. Echo's own catalog is searched first (case-insensitive substring match on title, author and ISBN).
  2. If that returns fewer than the page size (20), the rest of the page is filled with **Open Library** results, de-duplicated against the internal results by ISBN and by title + author.
  3. External results are **saved to Echo's catalog in the background**, so the catalog grows with use.
- Each result has `source: "internal" | "external"`. The UI shows a small badge: "From our library" (database icon) or "From Open Library" (globe icon), based on the first result's source.
- Each result card shows: cover (or a "No cover" placeholder), title, author, published year, a **"View details"** link (internal results only, since only they have a catalog `id`), and **three buttons to add the book to the library directly as Want / Reading / Finished**.
- **Load more** pagination: offset steps of 20. The client de-duplicates appended results. The API exposes the same paging (`offset`, `limit`, `hasMore`).
- Toasts: "Added *{title}* to library", or the error "Book already in your library".

### 4.3 Adding a book to the library (rules)
- When a book is added: the catalog entry is found by ISBN, or created. A `user_books` row is created with:
  - `status` as chosen
  - `startedAt = now` if the status is `reading`
  - `finishedAt = now` and `currentPage = pages` if the status is `finished`
  - `pageCount` copied from the catalog `pages`, so the user can override it per book
- Adding the same book twice returns the error "Book already in your library".

### 4.4 Library
- **Shelves (tabs):** ❤️ **Favorites**, 🔖 **Want to Read**, 📖 **Currently Reading** (the default tab), ✅ **Finished**. Favorites is a filter across all statuses (`isFavorite = true`), not a separate status.
- **Layout toggle:** grid or list. The choice is remembered per device (localStorage on the web; use local storage on mobile).
- The sidebar also lists the user's **Collections** (see 4.8), with a "+" to create one. This button triggers the paywall for free users.
- Empty state per shelf: "No books yet" plus a hint to search.
- Books are ordered by the date they were added, newest first.

**Book card (grid)** shows:
- Cover. Tapping it opens Book Detail.
- A **heart button** on the cover to toggle favorite.
- Title, author.
- A **page stepper:** `[−] [current / pageCount] [+]`. Tapping the middle opens a popover with two number spinners: **Current Page** and **Page Count**, both editable.
- For *Reading* books with a known page total: a progress bar with "X / Y pages" and a percentage.
- For *Finished* books with a rating: the 1–5 stars, read-only.
- An **overflow menu (⋮):** change status (the two other statuses), add to or remove from favorites, **Add to collection…**, **Remove from library** (asks for confirmation).

**List view** shows the same information in a compact row.

**Automatic status transitions** (worth mirroring in the mobile UX):
- Setting the current page above 0 on a non-reading book → the status becomes **Reading** and `startedAt` is set.
- Setting the current page equal to the page count → the status becomes **Finished** and `finishedAt` is set.
- Changing the status to **Reading** sets `startedAt` if it was empty.
- Changing the status to **Finished** sets `finishedAt` if it was empty, and sets the current page to the page count.
- Page values must be whole numbers from 0 to 100,000.

### 4.5 Book detail
Opened by the catalog `book.id`. Shows:
- A large cover, title, author, published year, page count, ISBN.
- **If the book is in the user's library:**
  - Their status, plus Started and Finished dates.
  - Buttons: Add to / Remove from Favorites, **Remove from library**.
  - **Reading progress** section (only when the status is *Reading* and the page total is known): a progress bar, a "current page" number input and an **Update** button. The page can't exceed the total. When it reaches the total, a 🎉 "Congratulations" message shows and the book is marked finished.
  - **Rating** section (only when the status is *Finished*): five tappable stars that save immediately. Text: "Rate this book" or "You rated this X out of 5".
  - **Review** section: shows the user's review (text, "Public" or "Private", date), or "You haven't written a review yet." The **Write / Edit review** button opens a form with a textarea, a **private toggle**, Save, Cancel and **Delete** (asks for confirmation).
- **Reviews from people you follow:** public reviews of this book written by users the viewer follows (username, text, date).
- Signed out: a prompt to sign in.

### 4.6 Reviews (rules)
- **One review per user per book.** Creating a review when one already exists updates it.
- Content is required, up to 10,000 characters.
- `isPrivate = true` reviews are visible only to their author. They never appear in feeds or in other users' views.
- Rating and review are independent: the rating lives on the UserBook, the review in `reviews`.

### 4.7 Social: Find users, follow, feed
**Find Users**
- Search by username or display name. The query must be at least 2 characters. Each result shows username (or display name), a one-line bio and a **Follow / Following** toggle button.
- You can't follow yourself. Following someone twice returns the error "Already following".
- **There is no public profile page for other users on the web yet.** The API has one for mobile: `GET /users/{userId}` (profile, stats, counts, shelves, public collections) and paginated `/users/{userId}/followers` and `/following`.

**Activity feed**
- Built from the users you follow. Two kinds of item, merged and sorted newest first:
  1. **Book activity:** a followed user's book with status *Reading* or *Finished*, labelled "started reading" or "finished reading" and sorted by the UserBook's `updatedAt`. Note: *any* update to that UserBook (page progress, favorite, rating) moves it back to the top of the feed.
  2. **Review activity:** a followed user's **public** review. The text is clamped to 3 lines.
- Each item shows the user's name, an action label, the cover thumbnail, the book title (opens Book Detail), the author, and the date and time.
- **Empty state** (not following anyone): "Your feed is empty", a short explanation, and a **Find Users** button.
- The API paginates the feed with `limit` and `offset` and returns `hasMore`, which suits infinite scroll.

### 4.8 Collections (Premium)
Custom groups of books from the user's own library, like playlists.

- **Create / edit dialog fields:**
  - **Name:** required, up to 100 characters.
  - **Description:** optional, up to 1000 characters on the server (the web form caps it at 500).
  - **Color:** a Tailwind palette and shade token, written `"{palette}-{shade}"` (e.g. `"blue-500"`). There are 22 palettes (slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose) × 4 shades (100, 300, 500, 700). The default is blue. The color is used for the collection's icon tint and a thick border around the collection view.
  - **Icon:** a **Lucide icon name** in kebab-case (e.g. `book`, `rocket`, `ghost`, `coffee`). There's a curated, searchable list of about 120 icons in `src/components/collections/icon-picker-modal.tsx`. The default is `book`. Lucide also ships a React Native package (`lucide-react-native`), so the names carry over.
  - **Cover image:** optional, uploaded to S3 (JPG, PNG or WEBP, up to 5 MB).
  - **Public toggle:** a public collection can be viewed by others through its URL slug.
- Each collection gets a unique **slug** (`name-xxxxxxxx`), which is regenerated when the name changes.
- **Add a book to collections:** from a book's overflow menu → a popover listing every collection with a checkbox and a book count. Toggling a checkbox adds or removes the book immediately. There's also a "New" button.
- **Collection view:** the cover banner, name, description, "N books", and the books in grid or list view using the same book cards as the library. Empty state: "No books in this collection yet".
- **Sidebar item:** the colored icon, name, book count, and a ⋮ menu with Edit, the Public/Private indicator, and Delete (asks for confirmation; this deletes the collection, not the books).
- **Paywall:** free users see a 👑 crown next to "Collections". Tapping create opens the **Premium paywall dialog**: "Unlock Custom Collections", a list of benefits, and the buttons *Maybe later* and *View plans*.
- **In the API but not in the web UI yet:** following other users' public collections, a public collection discovery list, viewing another user's public collection, and reordering collections (`sortOrder`).

### 4.9 Profile (own)
- Header: avatar, name, @username, email, and a **Settings** button (paid users only).
- **Stats tiles:** *Books This Year* (finished this calendar year), *Pages Read* (the sum of the catalog page counts of books finished this year), *Day Streak*. **The streak is hard-coded to 0 for now; it isn't implemented.** The API returns the first two (plus library totals) from `GET /profile/stats`.
- **Edit profile form:** username, display name, bio, profile picture upload.
- Shelves: **Favorites** (up to 6 covers, highlighted), **Currently Reading** (up to 6), **Recently Finished** (up to 6, by finish date). Each cover opens Book Detail.

### 4.10 Premium, pricing and subscription
- **Plans come from the database** (`subscription_plans`), managed by admins. Marketing copy today: **Free** (unlimited books, stats, reviews, social) vs **Echo Premium**, **€1.99/month or €19.99 lifetime**, which adds custom collections, priority support and early access. There are **no limits on the number of books** for anyone.
- What a user gets with Premium: **the only feature gated in code is Collections.**
- "Premium" means the subscription status is `active` or `trialing` **and** the plan is paid (price > 0, or it has a Stripe price, or its interval is `lifetime`). Admins can grant internal or lifetime plans manually.
- Web flow: Subscription page → plan list → **Stripe Checkout** (redirect) → `/subscription/success` or `/subscription/canceled`. Paid users manage billing in the **Stripe Customer Portal**. Stripe webhooks keep the subscription in sync and trigger emails (welcome to Premium, payment failed, subscription canceled).
- **Settings page** (paid users): email, username, current plan, a status badge, price, and "Renews" or "Expires" with a date. Lifetime plans show "🎉 You have lifetime access!".
- ⚠️ **Mobile note:** Apple and Google generally require in-app purchase for digital subscriptions bought inside the app. Stripe Checkout in a webview is not an option for iOS. Decide early: (a) IAP plus a server-side receipt sync into `user_subscriptions`, (b) "manage on the web" only, with no purchase button in the app, or (c) a reader-app or external-link entitlement where allowed. The backend currently only knows Stripe.

### 4.11 Other web-only areas (probably not needed on mobile)
- **Admin panel** (`/admin`, moderators and admins): dashboard stats (users, books, reviews, library entries, new users in 30 days, most popular books, recent users), user management (edit, change role, delete, grant or revoke premium), subscription plan CRUD, book catalog editing, review moderation (delete), an audit log, and an interactive **API playground** (`src/lib/api-docs.ts`, which also contains a "Mobile App Integration Guide").
- **Legal documents:** `/documents/privacy-policy` and `/documents/terms-of-service`. A mobile app should link to these.

---

## 5. Data model (fields the app will see)

```ts
type ReadingStatus = "want" | "reading" | "finished";

interface Book {            // catalog
  id: string; isbn: string | null; title: string; author: string;
  coverUrl: string | null;  // usually https://covers.openlibrary.org/b/id/{id}-L.jpg, or S3
  pages: number | null; publishedYear: number | null; createdAt: string;
}

interface UserBook {        // library entry
  id: string; userId: string; bookId: string;
  status: ReadingStatus;
  currentPage: number | null; pageCount: number | null;  // pageCount is a per-user override of book.pages
  rating: number | null;    // 1–5
  isFavorite: boolean;
  startedAt: string | null; finishedAt: string | null;
  createdAt: string; updatedAt: string;
  book: Book;               // included in most responses
}

interface Review {
  id: string; userId: string; bookId: string;  // bookId = catalog Book.id
  content: string; isPrivate: boolean; createdAt: string; updatedAt: string;
  user?: PublicUser; book?: Book;
}

interface PublicUser { id: string; username: string | null; displayName: string | null; profilePictureUrl: string | null; }

interface Collection {
  id: string; userId: string; name: string; description: string | null; slug: string;
  colorTag: string | null;  // "blue-500"
  iconName: string | null;  // lucide name, e.g. "rocket"
  coverImageUrl: string | null; isPublic: boolean; sortOrder: number;
  createdAt: string; updatedAt: string;
  bookCount: number; books: UserBook[];
  // public views (/collections/public, /collections/{idOrSlug}/public) also include:
  user?: PublicUser; followerCount?: number; isFollowing?: boolean;
}

interface SubscriptionPlan {
  id: string; name: string; price: number /* cents */; interval: "month" | "year" | "lifetime" | "free";
  stripePriceId: string | null; isActive: boolean; isInternal: boolean; sortOrder: number;
}
// subscription status: "active" | "canceled" | "past_due" | "unpaid" | "trialing" | "incomplete"
```

All dates are ISO 8601 strings.

---

## 6. REST API reference (`/api/v1`)

**Base:** `https://<host>/api/v1`. **Auth:** `Authorization: Bearer <Clerk session token>` on every endpoint; send `Content-Type: application/json` with request bodies.

**Response shape:** success responses return the data **directly**, with no `{ success, data }` wrapper. Mutations that have nothing to return respond with `{ success: true }`. Errors return `{ "error": "message" }` with status 400 (validation), 401 (not signed in), 403 (premium required), 404 (not found, including resources you aren't allowed to see) or 500. Malformed IDs in the path return 404.

**Pagination:** list endpoints take `limit` and `offset` query numbers (out-of-range values are clamped, not rejected) and return `hasMore`.

### Library
| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/books` | `?status=want\|reading\|finished`, `?favorite=true\|false` (optional, combinable) | Without filters: `{ favoriteBooks, wantToRead, currentlyReading, finished }`, arrays of `UserBook` (with `book`). With any filter: a flat `UserBook[]`. Newest first. Invalid filter values → 400. |
| POST | `/books` | `{ bookData: { title, author, isbn?, coverUrl?, pages?, publishedYear? }, status, isFavorite? }` | `201 { success, userBook }` |
| GET | `/books/{userBookId}` | – | `UserBook` with `book` |
| DELETE | `/books/{userBookId}` | – | `{ success }` |
| PUT | `/books/{userBookId}/status` | `{ status }` | `{ success }` (see the transition rules in §4.4) |
| PUT | `/books/{userBookId}/progress` | `{ currentPage?, pageCount? }` (at least one; if both are sent, `pageCount` is applied first) | `{ success }`. Same rules as the web stepper, below. |
| PUT | `/books/{userBookId}/rating` | `{ rating: 1–5 }` | `{ success }` |
| PUT | `/books/{userBookId}/favorite` | `{ isFavorite: boolean }` | `{ success }` |
| GET | `/books/search` | `q` (required), `offset` (default 0, max 1000), `limit` (default 20, max 40) | `{ results: SearchResult[], hasMore, offset, limit }` |
| GET | `/catalog/{bookId}` | – (catalog `book.id`) | `{ book, userBook: UserBook \| null, myReview: Review \| null, followingReviews: Review[] }`. `followingReviews` are public reviews of this book by people you follow, with `user` (public fields), newest first. 404 if the book doesn't exist. |

`SearchResult` = `{ id?, key?, isbn, title, author, coverUrl, pages, publishedYear, source: "internal" | "external" }`. Internal results have the catalog `id` (usable with `/catalog/{id}`); external ones have an Open Library `key`. Add either kind with `POST /books`.

> ⚠️ **Changed:** `/books/search` used to return a bare `SearchResult[]` (first 20 only). It now returns the paged object above. Because the external catalog's total isn't known, `hasMore` is `true` whenever the page is full, so the next page can come back empty; stop when `results` is empty. Use `limit=20` (the web's page size) unless you have a reason not to.

**Progress rules** (shared by the API and both web progress controls):
- `currentPage` is a whole number from 0 to 100,000 and can't exceed the page total: the per-user `pageCount`, else the catalog `book.pages`. If neither is known, any page is accepted.
- Reaching the total marks the book **Finished** (`finishedAt` = now; `startedAt` filled if empty).
- Any other page above 0 on a book that isn't *Reading* marks it **Reading** (`startedAt` filled if empty). This includes stepping a *Finished* book back below the total (`finishedAt` is kept).

### Reviews
| Method | Path | Body / Query | Returns |
|---|---|---|---|
| POST | `/reviews` | `{ bookId (catalog), content, isPrivate? }` | `201 { success }` (creates the review, or updates the existing one) |
| GET | `/reviews` | `?bookId=` optional, `?scope=following` optional (needs `bookId`) | With `bookId`: all **public** reviews of that book plus your own private one, with `user` and `book`, newest first, up to 100. With `bookId&scope=following`: only public reviews by people you follow. Without `bookId`: all of your own reviews, with `book`. |
| GET | `/reviews/{id}` | – | `Review` (404 if it's someone else's private review) |
| PUT | `/reviews/{id}` | `{ content, isPrivate? }` | `{ success }` |
| DELETE | `/reviews/{id}` | – | `{ success }` |

### Social
| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/users/search` | `q` (at least 2 characters), `limit` (default 20, max 50) | `{ results: [{ id, username, displayName, profilePictureUrl, bio, isFollowing }], hasMore, total, query }` |
| GET | `/users/{userId}` | – | Public profile (below). 404 for an unknown user. Works for yourself too (`isFollowing: false`). |
| GET | `/users/{userId}/followers` | `limit` (default 20, max 50), `offset` (max 10,000) | `{ results: (PublicUser & { isFollowing })[], hasMore }`, newest follow first. `isFollowing` = whether **you** follow that user. |
| GET | `/users/{userId}/following` | same | same |
| POST | `/social/follow` | `{ userId }` | `201 { success }` |
| DELETE | `/social/follow/{userId}` | – | `{ success }` |
| GET | `/feed` | `limit` (default 20, max 100), `offset` (max 1000) | `{ activities: FeedItem[], hasMore, limit, offset }` (or `{ activities: [], hasMore: false, total: 0 }` when you follow nobody) |

```ts
interface PublicProfile {
  user: PublicUser & { bio: string | null };
  stats: { booksFinishedThisYear: number; finishedCount: number };
  followerCount: number; followingCount: number; isFollowing: boolean;
  currentlyReading: UserBook[];   // up to 6, with book
  recentlyFinished: UserBook[];   // up to 6, by finishedAt
  favorites: UserBook[];          // up to 6
  publicCollections: (Omit<Collection, "books">)[];  // with bookCount, by sortOrder
}
// Reviews are not part of the profile; private reviews are never exposed anywhere.

type FeedItem =
  | { type: "book"; date: string; user: PublicUser; book: Book;
      data: { status: "reading" | "finished"; rating: number | null; currentPage: number | null; startedAt: string | null; finishedAt: string | null } }
  | { type: "review"; date: string; user: PublicUser; book: Book;
      data: { content: string; isPrivate: false } };
```

### Profile
| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/profile` | – | The user row (`id, email, username, bio, displayName, profilePictureUrl, role, createdAt, updatedAt`) plus `isPremium: boolean`, `planName: string \| null` |
| PUT | `/profile` | `{ username?, displayName?, bio?, profilePictureUrl? }` | `{ success }`. **Partial update:** only fields present in the body change; `null` or `""` clears `displayName`, `bio` or `profilePictureUrl`. `username` can be changed but not cleared. An empty body → 400. |
| GET | `/profile/stats` | – | `{ booksFinishedThisYear, pagesReadThisYear, totalBooks, countsByStatus: { want, reading, finished }, favoritesCount }` |
| GET | `/profile/username-available` | `?username=` (required) | `{ available: true }` or `{ available: false, reason }` (format error or "Username already taken"). Your own current username counts as available. |
| DELETE | `/profile` | – | `{ success: true }`. **Permanently deletes the account:** cancels a running Stripe subscription, deletes all of the user's data, then the Clerk user. Sign out on the client afterwards. |
| POST | `/profile/picture-upload-url` | `{ contentType, fileSize }` | `{ uploadUrl, publicUrl, expiresIn: 300 }` |

> ⚠️ **Changed:** `PUT /profile` used to replace every field (omitted fields were cleared) and required `username` on every call. It's now a partial update.

### Collections
| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/collections` | – | Your `Collection[]` (with `books` as `UserBook[]`, plus `bookCount`), ordered by `sortOrder` |
| POST | `/collections` | `{ name, description?, isPublic?, colorTag?, iconName? }` | `201 Collection`. **403** for non-premium users ("Premium subscription required…"). |
| GET | `/collections/{id}` | – | `Collection` (your own collections only) |
| PUT | `/collections/{id}` | `{ name?, description?, isPublic?, colorTag?, iconName?, coverImageUrl? }` | Updated `Collection` |
| DELETE | `/collections/{id}` | – | `{ success }` |
| POST | `/collections/{id}/books` | `{ userBookId }` | `201` collection-book row (400 "Book already in collection") |
| DELETE | `/collections/{id}/books?userBookId=` | – | `{ success }` |
| POST | `/collections/{id}/cover-upload-url` | `{ contentType, fileSize }` | `{ uploadUrl, publicUrl, expiresIn: 300 }`. Owner only (404 otherwise). |
| PUT | `/collections/order` | `{ order: string[] }`: every one of your collection IDs, exactly once, in the new order | `{ success }`. A missing, extra or duplicate ID → 400; an ID that isn't yours → 404. |
| GET | `/collections/public` | `limit` (default 20, max 50) | Public collections from everyone, newest first, each with `user`, `bookCount`, `followerCount` and `books` (the first 4 as a preview). |
| GET | `/collections/{idOrSlug}/public` | – | Any public collection, or one of your own private ones, by ID or slug, with `user`, `books`, `bookCount`, `followerCount`, `isFollowing`. Another user's private collection → 404. |
| POST | `/collections/{id}/follow` | – | `201 { success }`. 400 for your own collection or "Already following"; 404 if it doesn't exist or is private. |
| DELETE | `/collections/{id}/follow` | – | `{ success }` (404 for an unknown collection) |

### Image uploads
1. `POST /profile/picture-upload-url` or `POST /collections/{id}/cover-upload-url` with `{ contentType: "image/jpeg" | "image/png" | "image/webp", fileSize: <bytes, ≤ 5 MB> }`.
2. `PUT` the file to `uploadUrl` within `expiresIn` seconds, with exactly that `Content-Type` and size (the URL is signed for them).
3. Save `publicUrl` via `PUT /profile { profilePictureUrl }` or `PUT /collections/{id} { coverImageUrl }`. Only URLs issued to you are accepted.

### Subscriptions
| Method | Path | Returns |
|---|---|---|
| GET | `/subscriptions` | `{ subscription: { id, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd } \| null, plan, isActive, isFree }` |
| GET | `/subscriptions/usage` | `410`: removed, don't use. |

---

## 7. Validation and limits cheat-sheet

| Thing | Rule |
|---|---|
| Username | 3–30 characters, `[a-zA-Z0-9_.]`, unique |
| Display name | up to 100 characters |
| Bio | up to 1000 characters |
| Review | 1–10,000 characters, one per user per book |
| Rating | whole number from 1 to 5 |
| Pages (current page, page count) | whole number from 0 to 100,000 |
| Collection name | 1–100 characters (trimmed) |
| Collection description | up to 1000 characters |
| colorTag / iconName | string, up to 50 characters |
| Images | `image/jpeg`, `image/png` or `image/webp`; up to 5 MB |
| Book search query | trimmed, up to 200 characters; `limit` up to 40, `offset` up to 1000 |
| User search query | at least 2 characters |

---

## 8. Gaps: what the web app does that the API doesn't (yet)

The API now covers everything the web app does, except:

1. **Checkout and billing.** Stripe Checkout and the Customer Portal are web server actions only, and in-app purchase isn't decided yet (see §4.10). Read `isPremium` from `GET /profile` to decide whether to show collection features or the paywall.
2. **Reading streaks and goals.** Not implemented anywhere (the web streak tile is hard-coded to 0).
3. **Admin endpoints.** Web only, by design.

Known limitations to design around:
- **Book search paging** mixes Echo's catalog with Open Library, so `hasMore` is a best guess (see §6) and the boundary between internal and external results can repeat or skip an item between pages. De-duplicate appended results on the client, as the web does.
- **"Pages read"** uses the catalog page count, not the per-user `pageCount` override, matching the web profile.

---

## 9. Visual identity (current web)

- **Typography:** **EB Garamond** (a serif; weight 600 for display, 400 for body) and **IBM Plex Mono** for monospace accents. A literary, bookish feel.
- **Colors** (OKLCH):
  - Primary: soft **pink** `oklch(0.823 0.12 346)` (about `#F5A3C7`)
  - Secondary: **lavender** `oklch(0.87 0.065 274)`
  - Light mode: near-white, cool-tinted background `oklch(0.984 0.003 248)`, cards `oklch(0.968 0.007 248)`
  - Dark mode: deep indigo-slate background `oklch(0.18 0.013 277)`, cards `oklch(0.23 0.021 277)`, light lavender text; primary stays pink
  - Destructive: coral red `oklch(0.704 0.191 22)`. Star ratings are yellow-500, and the favorite heart uses the primary pink.
- **Corner radius:** very small (`0.15rem`): sharp, almost square cards.
- **Book covers:** 2:3 aspect ratio everywhere, with a muted "No cover" placeholder.
- **Icons:** Lucide throughout (Library, Search, Activity, Users, User, Heart, Bookmark, BookOpen, CircleCheck, Star, Crown for premium, FolderPlus for collections).
- **Feedback:** toast notifications for every mutation (success and error). Destructive actions ask for confirmation.
- Logo: `/public/echo.svg`. App icons: `/public/apple-icon.png`, `/public/icon.svg`.

---

## 10. Suggested mobile information architecture

- **Onboarding:** Clerk sign-in → **choose a username** (blocking) → empty library with a "Search for your first book" prompt.
- **Library tab:** a segmented control for Reading / Want / Finished / Favorites; grid or list toggle; a Collections row or section (with a premium lock for free users); a quick progress stepper on each Reading book.
- **Search tab:** search field → results with three quick-add actions (Want / Reading / Finished) and a source badge; infinite scroll.
- **Book detail:** cover hero, metadata, a status picker, progress (Reading), stars (Finished), my review (edit, with a private toggle), favorite, add to collection, remove, and reviews from people I follow.
- **Feed tab:** infinite list of book and review activity; an empty state that leads to Find Users; a Find Users screen with follow toggles.
- **Profile tab:** avatar, name, bio, edit; stats tiles; Favorites / Reading / Recently Finished shelves; Premium or Settings; legal links; sign out.
- **Premium:** a paywall sheet triggered by any collection action for free users.
