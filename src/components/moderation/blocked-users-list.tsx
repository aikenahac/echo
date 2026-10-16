"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { unblockUser } from "@/app/[locale]/actions/blocks";
import { Capsule } from "@/components/echo/buttons";
import { AdminBadge } from "@/components/echo/admin-badge";
import { AvatarTile } from "@/components/echo/primitives";

export type BlockedUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  profilePictureUrl: string | null;
  profilePictureBlurhash: string | null;
  isAdmin: boolean;
};

export function BlockedUsersList({ initial }: { initial: BlockedUser[] }) {
  const t = useTranslations("moderation");
  const [users, setUsers] = useState(initial);
  const [, startTransition] = useTransition();

  if (users.length === 0) {
    return <p className="mt-6 text-[15px] text-ink-2">{t("noneBlocked")}</p>;
  }

  const unblock = (id: string) => {
    startTransition(async () => {
      const result = await unblockUser(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    });
  };

  return (
    <ul className="mt-2">
      {users.map((u) => {
        const name = u.displayName || u.username || "?";
        return (
          <li key={u.id} className="flex items-center gap-3 py-3.5 [&+li]:hairline-t">
            <AvatarTile name={name} src={u.profilePictureUrl} blurhash={u.profilePictureBlurhash} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[17px] font-semibold tracking-[-0.4px]">
                <span className="truncate">{name}</span>
                {u.isAdmin && <AdminBadge size={14} />}
              </p>
              {u.username && u.displayName && (
                <p className="truncate text-[13px] text-ink-2">@{u.username}</p>
              )}
            </div>
            <Capsule size="xs" variant="outline" className="min-w-[88px]" onClick={() => unblock(u.id)}>
              {t("unblock")}
            </Capsule>
          </li>
        );
      })}
    </ul>
  );
}
