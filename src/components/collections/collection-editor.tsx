"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import {
  createCollection,
  deleteCollection,
  generateCollectionCoverUrl,
  updateCollection,
} from "@/app/[locale]/actions/collections";
import { FieldInput } from "@/components/echo/field-input";
import { Icon } from "@/components/echo/icons";
import { Sheet, SheetContent } from "@/components/echo/sheet";
import { Switch } from "@/components/echo/switch";
import { ConfirmSheet } from "@/components/library/book-actions-menu";
import { RISO_SWATCHES, collectionColors } from "@/lib/colors";
import { isValidImageSize, isValidImageType } from "@/lib/image-validation";
import { cn } from "@/lib/utils";
import { IconPickerModal } from "./icon-picker-modal";

export type EditableCollection = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  colorTag: string | null;
  iconName: string | null;
  coverImageUrl: string | null;
};

const QUICK_ICONS = ["book", "snowflake", "moon", "coffee", "flame"];

async function uploadCover(collectionId: string, file: File) {
  const result = await generateCollectionCoverUrl(collectionId, file.type, file.size);
  if (result.error || !result.uploadUrl || !result.publicUrl) {
    throw new Error(result.error || "Upload failed");
  }
  const response = await fetch(result.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!response.ok) throw new Error("Upload failed");
  const saved = await updateCollection(collectionId, { coverImageUrl: result.publicUrl });
  if (saved.error) throw new Error(saved.error);
}

/**
 * New / edit collection: cover image, name, description, six riso inks, an
 * icon, Public, and (when editing) Delete.
 */
export function CollectionEditor({
  open,
  onOpenChange,
  collection,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: EditableCollection | null;
  onSaved?: (saved: { slug: string } | undefined) => void;
  onDeleted?: () => void;
}) {
  const t = useTranslations("coll.editor");
  const tColl = useTranslations("coll");
  const editing = !!collection;
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [colorTag, setColorTag] = useState(collection?.colorTag ?? RISO_SWATCHES[5].value);
  const [iconName, setIconName] = useState(collection?.iconName ?? "book");
  const [isPublic, setIsPublic] = useState(collection?.isPublic ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(collection?.coverImageUrl ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const icons = QUICK_ICONS.includes(iconName) ? QUICK_ICONS : [iconName, ...QUICK_ICONS.slice(0, 4)];
  const legacyColour = !RISO_SWATCHES.some((s) => s.value === colorTag);

  const save = () => {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    startTransition(async () => {
      const data = { name, description, isPublic, colorTag, iconName };
      const result = editing
        ? await updateCollection(collection.id, data)
        : await createCollection(data);
      if (result.error || !result.collection) {
        toast.error(result.error);
        return;
      }
      if (file) {
        try {
          await uploadCover(result.collection.id, file);
        } catch {
          toast.error(t("coverInvalid"));
        }
      }
      toast.success(editing ? t("saved") : t("created"));
      onOpenChange(false);
      onSaved?.(result.collection);
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          title={editing ? t("editTitle") : t("newTitle")}
          size="lg"
          onDone={save}
          doneDisabled={pending}
          doneLabel={t("save")}
          closeLabel={tColl("cancel")}
          className="max-md:top-2"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (!isValidImageType(f.type) || !isValidImageSize(f.size, 5)) {
                toast.error(t("coverInvalid"));
                return;
              }
              setFile(f);
              setPreview(URL.createObjectURL(f));
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-dashed border-rule p-3 text-left hover:border-ink-3"
          >
            <span className="grid size-14 flex-none place-items-center overflow-hidden rounded-lg bg-tint text-ink-2">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <Icon name="image" />
              )}
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-pink-ink">
                {preview ? t("coverChange") : t("cover")}
              </span>
              <span className="block text-[13px] text-ink-2">{t("coverHint")}</span>
            </span>
          </button>

          <div className="mt-5 flex flex-col gap-5">
            <FieldInput
              label={t("name")}
              placeholder={t("namePlaceholder")}
              value={name}
              maxLength={100}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              error={error ?? undefined}
            />
            <div>
              <FieldInput
                label={t("description")}
                multiline
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
                inputClassName="!min-h-20"
              />
              <p className="mt-1.5 text-right text-[13px] text-ink-3 tnum">
                {t("counter", { count: description.length })}
              </p>
            </div>
          </div>

          <fieldset className="mt-2">
            <legend className="mb-2 text-[13px] font-semibold text-ink-2">{t("colour")}</legend>
            <div className="flex flex-wrap gap-3">
              {legacyColour && (
                <Swatch
                  label={colorTag}
                  color={collectionColors(colorTag).background}
                  selected
                  onSelect={() => {}}
                />
              )}
              {RISO_SWATCHES.map((s) => (
                <Swatch
                  key={s.value}
                  label={s.name}
                  color={s.hex}
                  selected={colorTag === s.value}
                  onSelect={() => setColorTag(s.value)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="mb-2 text-[13px] font-semibold text-ink-2">{t("icon")}</legend>
            <div className="flex flex-wrap gap-2">
              {icons.map((icon) => {
                const on = icon === iconName;
                const { background, foreground } = collectionColors(colorTag);
                return (
                  <button
                    key={icon}
                    type="button"
                    aria-label={icon}
                    aria-pressed={on}
                    onClick={() => setIconName(icon)}
                    className={cn(
                      "grid size-11 cursor-pointer place-items-center rounded-lg border",
                      on ? "border-transparent" : "border-rule text-ink hover:bg-tint",
                    )}
                    style={on ? { background, color: foreground } : undefined}
                  >
                    <DynamicIcon name={icon as IconName} size={20} strokeWidth={1.8} />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="h-11 cursor-pointer rounded-lg border border-rule px-4 text-[15px] font-semibold hover:bg-tint"
              >
                {t("moreIcons")}
              </button>
            </div>
          </fieldset>

          <div className="mt-6 hairline-t pt-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-[17px]">{t("public")}</span>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </label>
            <p className="mt-1.5 text-[13px] text-ink-2">{t("publicHelp")}</p>
          </div>

          {editing && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-8 w-full cursor-pointer py-3 text-center text-[17px] font-semibold text-negative"
            >
              {t("delete")}
            </button>
          )}
        </SheetContent>
      </Sheet>

      <IconPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIcon={iconName}
        onSelectIcon={setIconName}
      />

      {editing && (
        <ConfirmSheet
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={tColl("deleteTitle", { name: collection.name })}
          body={tColl("deleteBody")}
          confirmLabel={tColl("delete")}
          cancelLabel={tColl("cancel")}
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteCollection(collection.id);
              setConfirmDelete(false);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              onOpenChange(false);
              onDeleted?.();
            })
          }
        />
      )}
    </>
  );
}

function Swatch({
  label,
  color,
  selected,
  onSelect,
}: {
  label: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "size-11 cursor-pointer rounded-full ring-offset-2 ring-offset-paper transition-shadow",
        selected ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-rule",
      )}
      style={{ background: color }}
    />
  );
}
