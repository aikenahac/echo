"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/app/[locale]/actions/profile";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UsernameSetupDialogProps {
  hasUsername: boolean;
}

export function UsernameSetupDialog({ hasUsername }: UsernameSetupDialogProps) {
  const t = useTranslations("profile");
  const tToast = useTranslations("toast");
  const [username, setUsername] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(!hasUsername);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow letters, numbers, underscores, and dots
    const filtered = value.replace(/[^a-zA-Z0-9_.]/g, "");
    setUsername(filtered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error(tToast("errors.usernameEmpty"));
      return;
    }

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters long");
      return;
    }

    if (username.length > 30) {
      toast.error("Username must be at most 30 characters long");
      return;
    }

    startTransition(async () => {
      const result = await updateProfile(username, "");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("profileUpdated"));
        setIsOpen(false);
        // Reload to update the UI with the new username
        window.location.reload();
      }
    });
  };

  if (hasUsername) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("setup.title")}</DialogTitle>
          <DialogDescription>{t("setup.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("setup.usernameLabel")}</Label>
              <Input
                id="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder={t("setup.usernamePlaceholder")}
                disabled={isPending}
                autoFocus
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only letters, numbers, underscores (_), and dots (.) allowed. 3-30 characters.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("setup.saving") : t("setup.continue")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
