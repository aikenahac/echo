<div align="center">

<img src=".github/assets/echo-icon.svg" alt="Echo" width="120" />

# Echo

**Every page, counted.**

Log where you stopped, rate what you finish, and see what your friends are reading.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)](https://clerk.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[Features](#-features) · [Getting started](#-getting-started) · [Deployment](#-deployment)

</div>

---

## 📖 What is Echo

Echo is a calm little reading tracker. Keep your books on shelves, count the pages as you go, write down what you thought when you finish, and follow the people whose taste you trust.

This repository is the **web app**. A companion iOS and Android app (React Native + Expo) shares the same design and backend.

<p align="center">
  <img src=".github/assets/feature-graphic.png" alt="Echo: Every page, counted." width="720" />
</p>

## ✨ Features

- 📚 **Library shelves**: Want to read, Reading, Finished and Favourites, in a grid or list
- 🔢 **Page counter**: log where you stopped and watch the progress fill in
- ⭐ **Ratings and reviews**: star your finished books and write reviews, public or private
- 🗂️ **Collections**: group books your own way, with a custom icon (Premium)
- 👥 **Friends feed**: follow other readers and see what they start, finish and review
- 🔎 **Search**: one place for books and readers, backed by [Open Library](https://openlibrary.org)
- 🌗 **Light and dark**: follows your system, or pick one in Settings
- 🌍 **Ready for translation**: every string lives in `messages/`

### Plans

Echo is **free, with no limit on books**. **Premium** adds collections and helps keep a small app going. Payments run through [Lemon Squeezy](https://lemonsqueezy.com), which also handles taxes.

## 🚀 Getting started

### You'll need

- [Node.js](https://nodejs.org) 24 and [pnpm](https://pnpm.io)
- [Docker](https://www.docker.com), or any PostgreSQL database
- A free [Clerk](https://clerk.com) application for sign-in

### Run it locally

```bash
pnpm install
```

```bash
cp .env.example .env
```

Add your Clerk keys to `.env`. The rest can wait until you need it (see [Environment](#-environment)).

```bash
docker compose up -d
```

```bash
pnpm db:push
```

```bash
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) and create an account.

> [!TIP]
> Want a full library to play with? After signing in once, run
> `pnpm db:seed:dev --email you@example.com` to fill your account with books, reviews and a circle of readers to follow. It only runs against a local database.

## 🔑 Environment

All variables are listed in [`.env.example`](.env.example).

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | **Required.** Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | **Required.** Sign-in |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | The local Docker database |
| `NEXT_PUBLIC_BASE_URL` | Links in emails and checkouts |
| `LEMON_SQUEEZY_*` | Premium checkout and subscription webhooks |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Sending email |
| `SUPPORT_EMAIL`, `SUPPORT_IP_SALT` | The support page |
| `OPEN_LIBRARY_CONTACT` | Identifying Echo to the Open Library API |

## 🛠️ Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Build and run for production |
| `pnpm lint` / `pnpm format` | Lint, or format and auto-fix |
| `pnpm test` | Run the tests |
| `pnpm db:push` | Apply the schema to your dev database |
| `pnpm db:generate` | Create a migration for production |
| `pnpm db:studio` | Browse the database in Drizzle Studio |
| `pnpm db:seed:dev` | Fill a local account with sample data |

## 📦 Deployment

Echo ships as a single Docker image (see the [`Dockerfile`](Dockerfile)).

- Only public values (`NEXT_PUBLIC_*`, `AWS_S3_PUBLIC_URL`) are needed at build time. Secrets are passed to the container when it runs.
- Database migrations run automatically every time the container starts.
- Production runs on [Dokploy](https://dokploy.com) with a separate Postgres service.

## 🙏 Acknowledgments

- Book data from [Open Library](https://openlibrary.org)
- Sign-in by [Clerk](https://clerk.com)
- Payments by [Lemon Squeezy](https://lemonsqueezy.com)
- UI primitives from [shadcn/ui](https://ui.shadcn.com)
