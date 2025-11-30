# Echo - Book Reading Tracker

Echo is a modern, full-featured book reading tracker that helps you organize your reading journey, discover new books, and connect with fellow readers.

## Features

### Library Management
- Organize books into three categories: **Want to Read**, **Currently Reading**, and **Finished**
- Multiple view modes: Grid and List layouts with preference persistence
- Hybrid book search (internal database + Open Library API fallback)
- Track reading progress with page counts and completion percentages

### Reading Experience
- Progress tracking with visual progress bars
- 5-star rating system for finished books
- Write and manage book reviews (public or private)
- Celebrate reading milestones

### Social Features
- Follow other readers to see their activity
- Share reviews and reading progress
- Activity feed showing what friends are reading
- User profiles with reading statistics

### Internationalization
- Multi-language support using next-intl
- Fully localized interface
- Easy to add new languages

### Modern UI/UX
- Beautiful, responsive design with Tailwind CSS v4
- shadcn/ui component library for consistent styling
- Dark mode support
- Lucide icons throughout
- Smooth animations and transitions

## Tech Stack

### Frontend
- **Next.js 16.0.5** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **next-intl** - Internationalization
- **lucide-react** - Icon library
- **sonner** - Toast notifications

### Backend
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Type-safe database queries
- **Clerk** - Authentication and user management

### APIs
- **Open Library API** - External book data source

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database
- Clerk account for authentication

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd echo
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Clerk URLs (optional, can use defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/"
```

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (for emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000

Where to Get Each Variable

1. Stripe Keys (STRIPE_SECRET_KEY & NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

Steps:
1. Go to https://stripe.com and create an account (or log in)
2. You'll start in Test Mode (recommended for development)
3. Go to Developers → API Keys
4. Copy:
  - Secret key → STRIPE_SECRET_KEY (starts with sk_test_)
  - Publishable key → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (starts with pk_test_)

2. Stripe Webhook Secret (STRIPE_WEBHOOK_SECRET)

You'll set this up after creating your webhook endpoint. For now, you can skip it and add it
later when testing webhooks locally.

To get it later:
1. In Stripe Dashboard → Developers → Webhooks
2. Click Add endpoint
3. For local testing, you'll use Stripe CLI (see below)

3. Resend API Key (RESEND_API_KEY)

Steps:
1. Go to https://resend.com and sign up
2. After signing in, go to API Keys
3. Click Create API Key
4. Give it a name (e.g., "Echo Development")
5. Copy the key → RESEND_API_KEY (starts with re_)

⚠️ Important: You can only see the key once, so copy it immediately!

4. Resend From Email (RESEND_FROM_EMAIL)

Steps:
1. In Resend dashboard, go to Domains
2. Add and verify your domain (e.g., yourdomain.com)
3. Follow DNS verification steps
4. Once verified, you can use emails like:
  - noreply@yourdomain.com
  - hello@yourdomain.com

For testing without a domain:
- Resend provides onboarding@resend.dev for testing
- Use: RESEND_FROM_EMAIL=onboarding@resend.dev
- ⚠️ This only works for sending to your own email address

5. Base URL (NEXT_PUBLIC_BASE_URL)

For local development:
NEXT_PUBLIC_BASE_URL=http://localhost:3000

For production:
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

Testing Stripe Webhooks Locally

To test webhooks during development, use the Stripe CLI:

# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

This command will output a webhook signing secret like whsec_... - use that for
STRIPE_WEBHOOK_SECRET.

4. Set up the database:
```bash
# Generate migrations
pnpm drizzle-kit generate

# Push schema to database
pnpm drizzle-kit push
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    [locale]/          # Localized routes
      actions/         # Server actions
      books/           # Book-related pages
      feed/            # Activity feed
      library/         # User library
      profile/         # User profile
      users/           # User search
    globals.css        # Global styles
    layout.tsx         # Root layout
  components/          # React components
    ui/                # shadcn/ui components
  db/
    schema.ts          # Database schema
  hooks/               # Custom React hooks
  i18n/                # Internationalization config
  lib/                 # Utility functions
  types/               # TypeScript types
  messages/            # Translation files
    en.json            # English translations
```

## Database Schema

Echo uses the following main tables:

- **users** - User profiles (synced with Clerk)
- **books** - Book information
- **user_books** - User's library with reading status and progress
- **reviews** - Book reviews
- **follows** - Social follow relationships

## Key Features

### Hybrid Search
Echo implements a smart hybrid search strategy:
1. First searches your internal database for books you and others have added
2. Falls back to Open Library API only when no internal matches found
3. Shows visual indicators for data source (Database vs. External)

### Username Setup Flow
New users are prompted to set a username with a non-dismissible dialog, ensuring all users have proper profiles before accessing the app.

### Layout Preferences
Users can switch between grid and list views in their library, with preferences saved to localStorage for persistence.

## Development

### Available Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Database commands
pnpm drizzle-kit generate  # Generate migrations
pnpm drizzle-kit push      # Push schema to database
pnpm drizzle-kit studio    # Open Drizzle Studio
```

### Adding New Components

shadcn/ui components can be added using:
```bash
pnpm dlx shadcn@latest add <component-name>
```

### Adding Translations

1. Add new keys to `messages/en.json`
2. Create new language files in `messages/` directory
3. Update `src/i18n/routing.ts` to include new locales

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Book data provided by [Open Library](https://openlibrary.org/)
- Authentication powered by [Clerk](https://clerk.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
