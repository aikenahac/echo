"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  countNotificationAudience,
  sendAdminNotification,
  type NotificationAudience,
} from "@/app/[locale]/actions/notifications-admin";

type AudienceKind = NotificationAudience["kind"];
type LinkKind = "none" | "feed" | "book" | "user" | "custom";

const TITLE_MAX = 65;
const BODY_MAX = 180;

const audienceLabels: Record<AudienceKind, string> = {
  self: "Myself (test)",
  user: "One user",
  all: "All users",
  premium: "Premium users",
};

const linkLabels: Record<LinkKind, string> = {
  none: "None",
  feed: "Friends feed",
  book: "Book",
  user: "User profile",
  custom: "Custom app path",
};

const linkPlaceholders: Partial<Record<LinkKind, string>> = {
  book: "Catalog book id",
  user: "User id",
  custom: "/collection/<id>",
};

function buildAudience(kind: AudienceKind, identifier: string): NotificationAudience {
  return kind === "user" ? { kind, identifier } : { kind };
}

function buildUrl(kind: LinkKind, value: string) {
  const v = value.trim();
  switch (kind) {
    case "none":
      return undefined;
    case "feed":
      return "/friends";
    case "book":
      return v ? `/book/${encodeURIComponent(v)}` : undefined;
    case "user":
      return v ? `/user/${encodeURIComponent(v)}` : undefined;
    case "custom":
      return v || undefined;
  }
}

type Reach = { users: number; reachable: number } | { error: string };

export function SendNotificationForm() {
  const [audienceKind, setAudienceKind] = useState<AudienceKind>("self");
  const [identifier, setIdentifier] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkKind, setLinkKind] = useState<LinkKind>("none");
  const [linkValue, setLinkValue] = useState("");
  // The last count, with the audience it was counted for
  const [counted, setCounted] = useState<{ key: string; reach: Reach } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const isBroadcast = audienceKind === "all" || audienceKind === "premium";
  const url = buildUrl(linkKind, linkValue);
  const needsLinkValue = linkKind !== "none" && linkKind !== "feed";
  const canSend =
    !!title.trim() &&
    !!body.trim() &&
    (audienceKind !== "user" || !!identifier.trim()) &&
    (!needsLinkValue || !!url);

  const audienceKey = `${audienceKind}:${identifier.trim()}`;
  const reach = counted?.key === audienceKey ? counted.reach : null;

  // Recipient count, refreshed as the audience changes
  useEffect(() => {
    if (audienceKind === "user" && !identifier.trim()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await countNotificationAudience(
        buildAudience(audienceKind, identifier.trim()),
      );
      if (cancelled) return;
      setCounted({
        key: `${audienceKind}:${identifier.trim()}`,
        reach:
          "error" in result && result.error
            ? { error: result.error }
            : { users: result.users ?? 0, reachable: result.reachable ?? 0 },
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [audienceKind, identifier]);

  const send = async () => {
    setSending(true);
    try {
      const result = await sendAdminNotification({
        audience: buildAudience(audienceKind, identifier.trim()),
        title,
        body,
        url,
      });
      if (!("sent" in result)) {
        toast.error(result.error);
        return;
      }
      const { sent, failed, recipients } = result;
      if (recipients === 0) {
        toast.warning("Nobody in this audience has notifications turned on");
      } else if (failed > 0) {
        toast.warning(`Sent to ${sent} devices, ${failed} failed`);
      } else {
        toast.success(`Sent to ${sent} devices (${recipients} users)`);
      }
      setConfirming(false);
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBroadcast) setConfirming(true);
    else void send();
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Send notification</CardTitle>
        <CardDescription>
          Test on yourself first. Broadcasts ask for confirmation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="audience">Send to</Label>
              <Select
                value={audienceKind}
                onValueChange={(value) => setAudienceKind(value as AudienceKind)}
              >
                <SelectTrigger id="audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(audienceLabels) as AudienceKind[]).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {audienceLabels[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {audienceKind === "user" && (
              <div className="space-y-2">
                <Label htmlFor="identifier">Username or email</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="bookworm"
                  required
                />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {reach === null
              ? " "
              : "error" in reach
                ? reach.error
                : `${reach.users} ${reach.users === 1 ? "user" : "users"}, ${reach.reachable} with announcements on and a device`}
          </p>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={BODY_MAX}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              {body.length}/{BODY_MAX}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="link">Opens on tap</Label>
              <Select
                value={linkKind}
                onValueChange={(value) => {
                  setLinkKind(value as LinkKind);
                  setLinkValue("");
                }}
              >
                <SelectTrigger id="link">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(linkLabels) as LinkKind[]).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {linkLabels[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsLinkValue && (
              <div className="space-y-2">
                <Label htmlFor="linkValue">{linkLabels[linkKind]}</Label>
                <Input
                  id="linkValue"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder={linkPlaceholders[linkKind]}
                  className="font-mono"
                  required
                />
              </div>
            )}
          </div>

          <Button type="submit" disabled={!canSend || sending}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to {audienceLabels[audienceKind].toLowerCase()}?</DialogTitle>
            <DialogDescription>
              {reach && !("error" in reach)
                ? `This notifies ${reach.reachable} ${reach.reachable === 1 ? "user" : "users"} and can't be undone.`
                : "This can't be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground">{body}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void send()} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
