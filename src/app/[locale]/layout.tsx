import { ClerkProvider } from "@clerk/nextjs";
import { EB_Garamond, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { UsernameSetupDialog } from "@/components/username-setup-dialog";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import "../globals.css";
import { Metadata } from "next";
import { getViewer, isPaidPlan } from "@/lib/auth";

const eb_garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--display-family",
});

const eb_garamond_body = EB_Garamond({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--body-family",
});

const ibm_plex_mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://echobook.club",
  ),
  title: {
    default: "Echo - Track Your Reading Journey, Share Book Reviews",
    template: "%s | Echo Reads",
  },
  description:
    "Track your reading progress, organize your book library, write reviews, and connect with fellow readers. Echo is a social book tracking platform for passionate readers.",
  keywords: [
    "book tracker",
    "reading tracker",
    "book reviews",
    "reading journal",
    "book diary",
    "book library",
    "reading progress",
    "book recommendations",
    "social reading",
    "goodreads alternative",
    "book community",
    "reading statistics",
    "book catalog",
    "reading list",
  ],
  authors: [{ name: "Echo", url: "https://echo.aiken.si" }],
  creator: "Echo",
  publisher: "Echo",
  applicationName: "Echo",
  category: "Books & Literature",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Echo - Track Your Reading Journey, Share Book Reviews",
    description:
      "Track your reading progress, organize your book library, write reviews, and connect with fellow readers. Echo is a social book tracking platform for passionate readers.",
    siteName: "Echo",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Echo - Track Your Reading Journey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Echo - Track Your Reading Journey, Share Book Reviews",
    description:
      "Track your reading progress, organize your book library, write reviews, and connect with fellow readers.",
    images: ["/og-image.png"],
    creator: "@aikenahac",
    site: "@aikenahac",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en",
    },
  },
};

// Message namespaces used via `useTranslations` in client components.
// Add a namespace here when a client component starts using it.
const CLIENT_MESSAGE_NAMESPACES = [
  "common",
  "book",
  "bookCard",
  "collections",
  "library",
  "navigation",
  "premium",
  "profile",
  "search",
  "toast",
  "validation",
];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// This layout uses the database at runtime (user session checks). Ensure pages
// under this layout are rendered at runtime so the build step doesn't attempt
// to import the DB when DATABASE_URL isn't available in build containers.
export const dynamic = "force-dynamic";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Only send the namespaces used by client components to the browser.
  // Server components read messages on the server and don't need them here.
  const allMessages = await getMessages();
  const messages = Object.fromEntries(
    CLIENT_MESSAGE_NAMESPACES.filter((ns) => ns in allMessages).map((ns) => [
      ns,
      allMessages[ns],
    ])
  );

  // Check if user needs to set username and has admin access
  const viewer = await getViewer();
  const hasUsername = !viewer || !!viewer.username;
  const hasAdminAccess = viewer?.role === "moderator" || viewer?.role === "admin";
  // User has a paid plan if they have a subscription with a non-free plan (including free lifetime plans)
  const hasPaidPlan = isPaidPlan(viewer?.subscription?.plan);

  return (
    <ClerkProvider>
      <html lang={locale}>
        <head>
          <script defer data-domain="echobook.club" src="https://plausible.aerio.cloud/js/script.outbound-links.pageview-props.tagged-events.js"></script>
        </head>
        <body
          className={`${eb_garamond.variable} ${eb_garamond_body.variable} ${ibm_plex_mono.variable} antialiased`}
        >
          <NextIntlClientProvider messages={messages}>
            <Navigation hasAdminAccess={hasAdminAccess} hasPaidPlan={hasPaidPlan} />
            <main>{children}</main>
            <Footer />
            <UsernameSetupDialog hasUsername={hasUsername} />
            <Toaster richColors />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
