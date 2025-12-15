"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();
  const t = useTranslations("navigation");

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center text-left"
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>{t("signOut")}</span>
    </button>
  );
}
