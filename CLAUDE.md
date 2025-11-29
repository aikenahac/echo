# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Echo is a Next.js 16 book reading tracker with social features, built using TypeScript, PostgreSQL, Drizzle ORM, and Clerk authentication. Users can track books in their library with statuses (want/reading/finished), write reviews, follow other readers, and see an activity feed.

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Build for production
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
pnpm format                 # Format with Prettier and auto-fix lint issues

# Database
pnpm db:generate            # Generate Drizzle migrations from schema
pnpm db:migrate             # Apply migrations (use db:push in dev)
pnpm db:push                # Push schema changes directly (faster for dev)
pnpm db:studio              # Open Drizzle Studio (database GUI)
```

## Architecture

### App Router Structure

This is a Next.js 16 App Router project with internationalization using `next-intl`. All routes are under `src/app/[locale]/` where `[locale]` is the language code (currently only "en" is configured in `src/i18n/routing.ts`).

**Route organization:**
- `src/app/[locale]/page.tsx` - Home page
- `src/app/[locale]/library/` - User's book library
- `src/app/[locale]/books/` - Book search and detail pages
- `src/app/[locale]/feed/` - Social activity feed
- `src/app/[locale]/profile/` - User profile
- `src/app/[locale]/users/` - User search

### Server Actions Pattern

All data mutations and server-side operations use Next.js Server Actions located in `src/app/[locale]/actions/`:

- `books.ts` - Add/remove books from library, update reading status, progress, ratings
- `reviews.ts` - Create/update/delete reviews
- `social.ts` - Follow/unfollow users, fetch activity feed
- `profile.ts` - Update user profile (username, bio)
- `search.ts` - Hybrid search (database + Open Library API)

**Key pattern:** Server actions always call `auth()` from `@clerk/nextjs/server` to get the authenticated user ID, then use it for database operations.

### Database Architecture

The database uses Drizzle ORM with PostgreSQL. Schema is defined in `src/db/schema.ts` with the following tables:

**Core tables:**
- `users` - User profiles (id synced with Clerk, includes username, bio, premium status)
- `books` - Book catalog (ISBN, title, author, cover URL, pages, published year)
- `user_books` - Junction table linking users to books with reading metadata (status, current page, rating, favorites, timestamps)
- `reviews` - Book reviews (content, privacy flag)
- `follows` - Social graph (follower/following relationships)

**Important indexes:** Queries commonly filter by `userId`, `bookId`, and `status` - all are indexed.

**Database connection:** `src/db/index.ts` exports a singleton `db` instance using a Proxy pattern to lazy-initialize the connection only when first accessed.

### Hybrid Search System

The book search (`src/app/[locale]/actions/search.ts`) implements a two-tier strategy:

1. **First tier:** Search internal database for books already added by any user (faster, shows existing data)
2. **Second tier:** If no internal results, query Open Library API (external data source)

Results are tagged with `source: 'database' | 'external'` to show users where data originated.

**Book normalization:** Both database and API results are normalized to `NormalizedBook` type in `src/lib/books.ts` for consistent handling.

### Authentication Flow

Uses Clerk for authentication. Important patterns:

- **New user setup:** `username-setup-dialog.tsx` forces new users to set a username via a non-dismissible dialog
- **User sync:** Users table is lazily created when they first add a book (see `addBookToLibrary` in `actions/books.ts`)
- **Auth checks:** All server actions use `await auth()` to get `userId` and return `{ error: "Unauthorized" }` if missing

### State Management

- **Client-side preferences:** Layout preferences (grid/list view) use localStorage via custom hook `use-library-layout.ts`
- **Server state:** Uses Next.js cache revalidation with `revalidatePath()` after mutations
- **Optimistic updates:** Not currently implemented - UI updates after server actions complete

### Internationalization

Uses `next-intl` configured in `src/i18n/`:

- Translation files in `messages/{locale}.json`
- Routing defined in `src/i18n/routing.ts` (currently only "en")
- Navigation wrappers exported from routing.ts (`Link`, `redirect`, `useRouter`, etc.)

**To add a new language:**
1. Create `messages/{locale}.json`
2. Add locale to `locales` array in `src/i18n/routing.ts`

### Component Organization

- `src/components/ui/` - shadcn/ui components (Button, Dialog, Card, etc.)
- `src/components/` - Feature components (BookCard, LibraryTabs, SearchBooks, etc.)

**Key components:**
- `book-card.tsx` - Displays book with cover, add/remove buttons, progress tracking
- `library-tabs.tsx` - Tabs for want/reading/finished with book lists
- `search-books.tsx` - Hybrid search interface
- `navigation.tsx` - Main nav with username display and Clerk UserButton

## Configuration

### Environment Variables

Required in `.env`:
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

### Next.js Configuration

- **Output mode:** `standalone` for Docker deployment
- **React Compiler:** Enabled (experimental)
- **Images:** Configured to allow `covers.openlibrary.org` domain

### Tailwind CSS

Uses Tailwind CSS v4 with:
- `@tailwindcss/postcss` plugin
- shadcn/ui theming via CSS variables
- Custom animations from `tw-animate-css`

## Database Migrations

**Development workflow:**
1. Modify `src/db/schema.ts`
2. Run `pnpm db:push` to apply changes immediately (no migration file)

**Production workflow:**
1. Modify `src/db/schema.ts`
2. Run `pnpm db:generate` to create migration in `drizzle/` directory
3. Migration runs automatically on Docker container startup via `src/db/migrate.ts`

## Deployment

### Docker

The Dockerfile uses multi-stage builds:
1. **deps** - Install dependencies with pnpm
2. **builder** - Build Next.js app and compile migration script
3. **runner** - Production image with standalone output

**Important:** Migrations run automatically before the server starts (see `start:migrate` script).

### Adding shadcn/ui Components

```bash
pnpm dlx shadcn@latest add <component-name>
```

This adds components to `src/components/ui/` with proper theming.

## Common Patterns

### Adding a Server Action

1. Create function in appropriate file under `src/app/[locale]/actions/`
2. Mark file with `"use server"` directive
3. Call `await auth()` to get userId
4. Perform database operation with `db` from `@/db`
5. Call `revalidatePath()` to update cached data
6. Return success/error object

### Querying Books with Relations

```typescript
await db.query.userBooks.findMany({
  where: and(
    eq(userBooks.userId, userId),
    eq(userBooks.status, status)
  ),
  with: {
    book: true,  // Join with books table
  },
});
```

### Adding a New Reading Status Value

1. Update `readingStatusEnum` in `src/db/schema.ts`
2. Generate migration with `pnpm db:generate`
3. Update `ReadingStatus` type in actions/books.ts
4. Update UI components that display status
