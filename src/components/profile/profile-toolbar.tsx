"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ToolbarButton, ToolbarGroup } from "@/components/echo/buttons";
import { Icon } from "@/components/echo/icons";
import { EditProfileSheet, type EditableProfile } from "./edit-profile-sheet";

/** Pencil (edit profile sheet) and gear (settings), top right. */
export function ProfileToolbar({ profile }: { profile: EditableProfile }) {
  const t = useTranslations("you");
  const [editing, setEditing] = useState(false);
  return (
    <>
      <ToolbarGroup>
        <ToolbarButton label={t("edit")} onClick={() => setEditing(true)}>
          <Icon name="pen" />
        </ToolbarButton>
        <ToolbarButton label={t("settings")} asChild>
          <Link href="/settings">
            <Icon name="gear" />
          </Link>
        </ToolbarButton>
      </ToolbarGroup>
      <EditProfileSheet open={editing} onOpenChange={setEditing} profile={profile} />
    </>
  );
}

/** "Add a line about what you read" opens the same sheet. */
export function EditProfileLink({
  profile,
  children,
}: {
  profile: EditableProfile;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="cursor-pointer text-left text-pink-ink hover:underline"
      >
        {children}
      </button>
      <EditProfileSheet open={editing} onOpenChange={setEditing} profile={profile} />
    </>
  );
}
