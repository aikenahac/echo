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
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

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
