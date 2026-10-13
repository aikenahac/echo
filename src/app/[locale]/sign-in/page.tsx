import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("signIn.title") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId } = await auth();
  if (userId) redirect({ href: "/library", locale });

  return (
    <AuthShell backHref="/">
      <SignInForm />
    </AuthShell>
  );
}
