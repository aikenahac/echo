import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { EB_Garamond, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Navigation } from "@/components/navigation";
import { UsernameSetupDialog } from "@/components/username-setup-dialog";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import "../globals.css";
import { Metadata } from "next";

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
    process.env.NEXT_PUBLIC_BASE_URL || "https://echo.aiken.si",
  ),
  title: {
    default: "Echo Reads - Better diary for your books",
    template: "%s | Echo Reads",
  },
  description: "Better diary for your books",
  keywords: [],
  authors: [{ name: "Echo" }],
  creator: "Echo",
  publisher: "Echo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Echo Reads - Better diary for your books",
    description: "Better diary for your books",
    siteName: "Mess with Humanity",
  },
  twitter: {
    card: "summary_large_image",
    title: "Echo Reads - Better diary for your books",
    description: "Better diary for your books",
  },
  robots: {
    index: true,
    follow: true,
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
  },
};

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

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  // Check if user needs to set username and has admin access
  const { userId } = await auth();
  let hasUsername = true;
  let hasAdminAccess = false;

  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    hasUsername = !!user?.username;
    hasAdminAccess = user?.role === "moderator" || user?.role === "admin";
  }

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body
          className={`${eb_garamond.variable} ${eb_garamond_body.variable} ${ibm_plex_mono.variable} antialiased`}
        >
          <NextIntlClientProvider messages={messages}>
            <Navigation hasAdminAccess={hasAdminAccess} />
            <main>{children}</main>
            <UsernameSetupDialog hasUsername={hasUsername} />
            <Toaster richColors />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
