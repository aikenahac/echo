"use client";

import { useEffect, useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  checkUsernameAvailable,
  updateProfileFields,
} from "@/app/[locale]/actions/profile";
import { Capsule } from "@/components/echo/buttons";
import { Icon } from "@/components/echo/icons";
import { AvatarTile } from "@/components/echo/primitives";
import { isBarePath } from "@/components/navigation";

interface UsernameSetupDialogProps {
  hasUsername: boolean;
}

/**
 * First run: a blocking full-screen page on the pink field that asks for a
 * username, with a live availability check and a preview of how it shows up.
 */
export function UsernameSetupDialog({ hasUsername }: UsernameSetupDialogProps) {
  const t = useTranslations("profile.setup");
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "ok" }
    | { state: "error"; message: string }
  >({ state: "idle" });
  const [isPending, startTransition] = useTransition();
  // Closes right after saving, before the refreshed prop arrives
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (username.length < 3) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      setStatus({ state: "checking" });
      const result = await checkUsernameAvailable(username);
      if (cancelled) return;
      setStatus(
        result.available
          ? { state: "ok" }
          : { state: "error", message: result.reason ?? "" },
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [username]);

  if (hasUsername || isSaved || isBarePath(pathname)) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3 || status.state === "error") return;
    startTransition(async () => {
      const result = await updateProfileFields({ username });
      if (result.error) {
        setStatus({ state: "error", message: result.error });
      } else {
        setIsSaved(true);
        router.refresh();
      }
    });
  };

  const handle = username || "username";

  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="on-field fixed inset-0 z-50 overflow-y-auto bg-field outline-none"
        >
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pt-[max(20px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]"
          >
            <p className="font-disp mt-3.5 text-[22px] leading-none">Echo</p>
            <DialogPrimitive.Title className="font-disp mt-[clamp(28px,8vh,72px)] text-[clamp(44px,9vw,64px)] leading-[.9] tracking-[-0.6px] text-balance">
              {t("headline")}
            </DialogPrimitive.Title>
            <div className="mt-8 flex h-14 items-center gap-0.5 rounded-xl bg-paper px-4 text-[17px] text-[#170B11] dark:text-ink">
              <span className="text-ink-3">@</span>
              <input
                aria-label={t("headline")}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                value={username}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^a-zA-Z0-9_.]/g, "");
                  setUsername(next);
                  if (next.length < 3) setStatus({ state: "idle" });
                }}
                className="h-full min-w-0 flex-1 bg-transparent caret-pink-ink outline-none"
              />
              {status.state === "ok" && (
                <span className="ml-auto flex items-center gap-1 text-[15px] font-semibold text-pink-ink">
                  <Icon name="check" size={16} strokeWidth={2.2} />
                  {t("available")}
                </span>
              )}
              {status.state === "checking" && (
                <span className="ml-auto text-[15px] text-ink-3">{t("checking")}</span>
              )}
            </div>
            <DialogPrimitive.Description
              className={
                status.state === "error"
                  ? "mt-3 text-[15px] leading-5 font-semibold"
                  : "mt-3 text-[15px] leading-5 text-on-field-2"
              }
              role={status.state === "error" ? "alert" : undefined}
            >
              {status.state === "error" ? status.message : t("help")}
            </DialogPrimitive.Description>

            <div
              aria-hidden
              className="mt-10 flex -rotate-[1.5deg] items-center gap-3 rounded-xl bg-paper p-3.5 text-ink shadow-[0_12px_24px_-14px_rgba(70,8,36,.45)] max-[760px]:hidden"
            >
              <AvatarTile name={handle} size={36} />
              <div className="min-w-0 text-[15px] leading-5">
                <p className="truncate">
                  <b className="font-semibold">@{handle}</b>{" "}
                  <span className="rounded-[2px] bg-field px-1 text-on-field">
                    {t("previewAction")}
                  </span>
                </p>
                <p className="text-[13px] text-ink-2">{t("previewMeta")}</p>
              </div>
            </div>

            <Capsule
              type="submit"
              variant="field"
              size="lg"
              className="mt-auto w-full"
              disabled={isPending || username.length < 3 || status.state !== "ok"}
            >
              {isPending ? t("saving") : t("continue")}
            </Capsule>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
