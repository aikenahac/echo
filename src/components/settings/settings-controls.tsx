"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { deleteAccount, updateProfileFields } from "@/app/[locale]/actions/profile";
import { createPortalSession } from "@/app/[locale]/actions/subscriptions";
import { disconnectDiscord, getDiscordConnectUrl } from "@/app/[locale]/actions/discord";
import { AdminBadge } from "@/components/echo/admin-badge";
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
import { AUDIENCES, type Audience } from "@/lib/audience";
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

/** Who can see one part of the viewer's profile; saves on change. */
export function PrivacyRow({
  setting,
  initial,
}: {
  setting: "profileVisibility" | "activityVisibility" | "reviewVisibility";
  initial: Audience;
}) {
  const t = useTranslations("settingsPage");
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  return (
    <ChoiceRow
      label={t(`${setting}.label`)}
      value={value}
      options={AUDIENCES.map((v) => ({
        value: v,
        label: t(`${setting}.options.${v}`),
      }))}
      onChange={(next) => {
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const result = await updateProfileFields({ [setting]: next });
          if (result.error) {
            setValue(previous);
            toast.error(result.error);
          }
        });
      }}
    />
  );
}

export function AccountRow({
  profile,
  email,
  name,
  isAdmin,
  avatar,
}: {
  profile: EditableProfile;
  email: string;
  name: string;
  isAdmin: boolean;
  avatar: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${row} cursor-pointer`}>
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 font-semibold">
            <span className="truncate">{name}</span>
            {isAdmin ? <AdminBadge size={13} focusable={false} /> : null}
          </span>
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

const DISCORD_RESULTS = {
  linked: "discordLinked",
  taken: "discordTaken",
  denied: "discordDenied",
  error: "discordError",
} as const;

/** Link a Discord account (Echo Member role, plus Premium while paid) */
export function DiscordConnectRow({ connected }: { connected: boolean }) {
  const t = useTranslations("settingsPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Outcome of the OAuth round trip: /settings?discord=linked|taken|denied|error
  const result = searchParams.get("discord");
  useEffect(() => {
    if (!result || !(result in DISCORD_RESULTS)) return;
    const key = DISCORD_RESULTS[result as keyof typeof DISCORD_RESULTS];
    if (result === "linked") toast.success(t(key));
    else toast.error(t(key));
    router.replace("/settings");
  }, [result, router, t]);

  const connect = () =>
    startTransition(async () => {
      const res = await getDiscordConnectUrl();
      if ("error" in res) toast.error(t("discordError"));
      else window.location.assign(res.url);
    });

  const disconnect = () =>
    startTransition(async () => {
      const res = await disconnectDiscord();
      if ("error" in res) toast.error(t("discordError"));
      else {
        toast.success(t("discordDisconnected"));
        router.refresh();
      }
    });

  if (connected) {
    return (
      <div className={row}>
        <span className="flex-1">{t("discordConnected")}</span>
        <button
          type="button"
          onClick={disconnect}
          disabled={pending}
          className="cursor-pointer text-ink-2 disabled:opacity-50"
        >
          {t("disconnectDiscord")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={pending}
      className={`${row} cursor-pointer disabled:opacity-50`}
    >
      <span className="flex-1">
        <span className="block">{t("connectDiscord")}</span>
        <span className="block text-[13px] text-ink-2">{t("connectDiscordHint")}</span>
      </span>
      <Icon name="forward" size={16} className="text-ink-3" />
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
