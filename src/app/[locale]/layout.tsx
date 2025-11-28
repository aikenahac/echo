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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  // Check if user needs to set username
  const { userId } = await auth();
  let hasUsername = true;

  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    hasUsername = !!user?.username;
  }

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body
          className={`${eb_garamond.variable} ${eb_garamond_body.variable} ${ibm_plex_mono.variable} antialiased`}
        >
          <NextIntlClientProvider messages={messages}>
            <Navigation />
            <main>{children}</main>
            <UsernameSetupDialog hasUsername={hasUsername} />
            <Toaster richColors />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
