"use client";

import { useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { deleteAccount } from "@/app/[locale]/actions/profile";
import { createPortalSession } from "@/app/[locale]/actions/subscriptions";
import { Icon } from "@/components/echo/icons";
import { ConfirmSheet } from "@/components/library/book-actions-menu";
import {
  EditProfileSheet,
  type EditableProfile,
} from "@/components/profile/edit-profile-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPEARANCE_COOKIE, type Appearance } from "@/lib/appearance-cookie";
import {
  LIBRARY_LAYOUT_COOKIE,
  type LibraryLayout,
} from "@/lib/library-layout-cookie";

const ONE_YEAR = 60 * 60 * 24 * 365;
const row =
  "flex min-h-[52px] w-full items-center gap-3 py-3 text-left text-[17px]";

/** A settings row whose value opens a small menu of options. */
function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`${row} cursor-pointer`}>
        <span className="flex-1">{label}</span>
        <span className="text-ink-2">
          {options.find((o) => o.value === value)?.label}
        </span>
        <Icon name="chev" size={16} className="text-ink-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppearanceRow({ initial }: { initial: Appearance }) {
  const t = useTranslations("settingsPage");
  const [value, setValue] = useState(initial);
  return (
    <ChoiceRow
      label={t("appearance")}
      value={value}
      options={(["system", "light", "dark"] as const).map((v) => ({
        value: v,
        label: t(`appearanceOptions.${v}`),
      }))}
      onChange={(next) => {
        setValue(next);
        document.cookie = `${APPEARANCE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
        if (next === "system") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", next);
      }}
    />
  );
}

export function LayoutRow({ initial }: { initial: LibraryLayout }) {
  const t = useTranslations("settingsPage");
  const [value, setValue] = useState(initial);
  return (
    <ChoiceRow
      label={t("libraryLayout")}
      value={value}
      options={(["grid", "list"] as const).map((v) => ({
        value: v,
        label: t(`layoutOptions.${v}`),
      }))}
      onChange={(next) => {
        setValue(next);
        document.cookie = `${LIBRARY_LAYOUT_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
      }}
    />
  );
}

export function AccountRow({
  profile,
  email,
  name,
  avatar,
}: {
  profile: EditableProfile;
  email: string;
  name: string;
  avatar: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${row} cursor-pointer`}>
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{name}</span>
          <span className="block truncate text-[13px] text-ink-2">{email}</span>
        </span>
        <Icon name="forward" size={16} className="text-ink-3" />
      </button>
      <EditProfileSheet open={open} onOpenChange={setOpen} profile={profile} />
    </>
  );
}

export function BillingRow() {
  const t = useTranslations("settingsPage");
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createPortalSession();
          if (result.url) window.location.href = result.url;
          else toast.error(result.error);
        })
      }
      className={`${row} cursor-pointer text-pink-ink disabled:opacity-60`}
    >
      <span className="flex-1">{t("billing")}</span>
      <Icon name="external" size={16} />
    </button>
  );
}

export function SignOutRow() {
  const t = useTranslations("settingsPage");
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: "/" })}
      className={`${row} cursor-pointer`}
    >
      {t("signOut")}
    </button>
  );
}

export function DeleteAccountRow() {
  const t = useTranslations("settingsPage");
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${row} cursor-pointer text-negative`}
      >
        {t("deleteAccount")}
      </button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title={t("deleteTitle")}
        body={t("deleteBody")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteAccount();
            if (result.error) {
              toast.error(result.error);
              return;
            }
            setOpen(false);
            await signOut({ redirectUrl: "/" }).catch(() => router.push("/"));
          })
        }
      />
    </>
  );
}
