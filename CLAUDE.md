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
- `src/app/[locale]/page.tsx` - Welcome page (signed out); redirects to `/library` when signed in
- `src/app/[locale]/sign-in`, `sign-up`, `reset-password`, `sso-callback` - Custom Clerk flows (`useSignIn`/`useSignUp`, no prebuilt Clerk UI)
- `src/app/[locale]/library/` - Library (`?shelf=reading|want|finished|favourites`) and collections
- `src/app/[locale]/books/[id]` - Book detail
- `src/app/[locale]/search` - Search (`?q=&tab=books|readers`); `/books/search` and `/users/search` redirect here
- `src/app/[locale]/feed/` - Friends feed
- `src/app/[locale]/profile/`, `settings/` - You and Settings
- `src/app/[locale]/redeem` - Redeem a promo code (`?code=` prefill); codes are managed at `/admin/promo-codes`. A grant has `source: "promo"`, expires lazily via `expirePromoGrant` (`src/lib/promo.ts`), and gives way to a real purchase

Signed-out pages (welcome, auth, pricing, documents) render without the app chrome; see `isBarePath` in `src/components/navigation.tsx`.

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
- **User sync:** The users row and free plan are created on first visit by `getViewer()` in `src/lib/auth.ts` (called from the locale layout, cached per request with React `cache`). Server actions assume the row exists.
- **Auth checks:** All server actions use `await auth()` to get `userId` and return `{ error: "Unauthorized" }` if missing

### State Management

- **Client-side preferences:** Grid/list layout (`library-layout` cookie, `use-library-layout.ts`) and appearance (`appearance` cookie: system/light/dark, read in the locale layout into `data-theme` on `<html>`) are cookies so the server renders them without a flash
- **Server state:** Uses Next.js cache revalidation after mutations via `revalidateLocalized()` from `src/lib/revalidate.ts` (every URL is locale-prefixed, so a bare `revalidatePath("/library")` would not match `/en/library`)
- **Optimistic updates:** The library page counter updates locally and saves debounced; most other mutations call `router.refresh()` after the server action

### Internationalization

Uses `next-intl` configured in `src/i18n/`:

- Translation files in `messages/{locale}.json`
- Routing defined in `src/i18n/routing.ts` (currently only "en")
- Navigation wrappers exported from routing.ts (`Link`, `redirect`, `useRouter`, etc.)

**To add a new language:**
1. Create `messages/{locale}.json`
2. Add locale to `locales` array in `src/i18n/routing.ts`

### Component Organization

The UI follows the redesign ported from the mobile app (`echo-mobile/design/redesign`): pink `field` means "in progress / now" only, everything else sits on `paper`; no cards (hairlines and space); covers are the only things with shadows; display type is Archivo condensed.

- `src/components/echo/` - Design primitives: `Cover`, `Stamp`, `PlateNumber`, `AvatarTile`, `Stars`, `ProgressBar`, `FieldBand`, `Capsule`/`IconButton`, `Sheet` (bottom sheet on phones, centred panel on wider screens), `Segmented`, `FieldInput`, `Switch`, `Icon` (the design's own glyphs; Lucide only for user-chosen collection icons)
- `src/components/library/` - Library: `ReadingHero` + `PageCounter` (the numbering-stamp page counter), shelf views, book actions menu
- `src/components/book/`, `feed/`, `search/`, `profile/`, `settings/`, `collections/`, `plans/`, `auth/` - Feature components per screen
- `src/components/navigation.tsx` - Left rail (lg+) and floating tab bar + Search button (phones)
- `src/components/ui/` - shadcn/ui primitives, restyled to the tokens; Card/Table/Select/Tabs/Badge remain for the admin area only

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
- Echo tokens in `src/app/globals.css` (`paper`, `field`, `ink`, `ink-2`, `ink-3`, `rule`, `tint`, `pink-ink`, `on-field`, `negative`, `plate`) with designed dark values; shadcn names are mapped onto them
- Utilities: `font-disp` (Archivo at width 62), `plate` (pink misregistration shadow), `tnum`, `hairline-t`, `glass`, `on-field` (re-points ink/rule tokens for content on the pink field)
- Custom animations from `tw-animate-css`

## Database Migrations

**Development workflow:**
1. Modify `src/db/schema.ts`
2. Run `pnpm db:push` to apply changes immediately (no migration file)

**Production workflow:**
1. Modify `src/db/schema.ts`
2. Run `pnpm db:generate` to create migration in `drizzle/` directory
3. The image's `CMD` applies pending migrations (`node dist/migrate.js`) before starting the server, so every deploy migrates; a failed migration stops the container

**Note:** `drizzle/0005`-`0007` are hand-written, idempotent SQL files listed in `drizzle/meta/_journal.json` without snapshots. The last snapshot (`0004`) is behind the schema, so `db:generate` would also emit the older drift until the snapshots are re-baselined. Keep any further hand-written migration idempotent and add it to the journal.

## Deployment

### Docker

The Dockerfile uses multi-stage builds:
1. **deps** - Install dependencies with pnpm
2. **builder** - Build Next.js app and compile migration script
3. **runner** - Production image with standalone output

**Important:** Secrets are not build args; provide them to the container at runtime. Only `NEXT_PUBLIC_*` values and `AWS_S3_PUBLIC_URL` (allowed `next/image` host) are needed at build time. Production runs on Dokploy, which builds the image from this Dockerfile (public values as Build Args) and connects it to a separate Postgres service; migrations run on container start.

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
5. Validate inputs at runtime (server actions are public POST endpoints) and scope writes with `and(eq(id), eq(userId))`
6. Call `revalidateLocalized()` to update cached data
7. Return success/error object

When exposing other users, select `publicUserColumns` from `src/lib/public-user.ts` (never email/role).

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
