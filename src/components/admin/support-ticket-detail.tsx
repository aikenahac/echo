"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteSupportTicket,
  updateSupportTicketNote,
  updateSupportTicketStatus,
} from "@/app/[locale]/actions/support-admin";
import { supportStatusLabel } from "@/components/admin/support-status-badge";
import {
  SUPPORT_LIMITS,
  SUPPORT_STATUSES,
  supportStatusSchema,
  type SupportStatus,
} from "@/lib/support";

export function SupportTicketDetail({
  id,
  name,
  email,
  message,
  initialStatus,
  initialNote,
  createdLabel,
  updatedLabel,
  resolvedLabel,
}: {
  id: string;
  name: string;
  email: string;
  message: string;
  initialStatus: SupportStatus;
  initialNote: string;
  createdLabel: string;
  updatedLabel: string;
  resolvedLabel: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(initialNote);
  const [savedNote, setSavedNote] = useState(initialNote);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingNote, startSaveNote] = useTransition();
  const [deleting, startDelete] = useTransition();

  // Optimistic: show the new status at once, roll back if the save fails
  async function changeStatus(next: SupportStatus) {
    const previous = status;
    if (next === previous) return;
    setStatus(next);
    try {
      const result = await updateSupportTicketStatus(id, next);
      if ("error" in result) throw new Error(result.error);
      router.refresh();
    } catch {
      setStatus(previous);
      toast.error("Failed to update status");
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  function saveNote() {
    startSaveNote(async () => {
      try {
        const result = await updateSupportTicketNote(id, note);
        if ("error" in result) throw new Error(result.error);
        setSavedNote(note);
        toast.success("Note saved");
      } catch {
        toast.error("Failed to save note");
      }
    });
  }

  function remove() {
    startDelete(async () => {
      try {
        const result = await deleteSupportTicket(id);
        if ("error" in result) throw new Error(result.error);
        toast.success("Ticket deleted");
        router.push("/admin/support");
      } catch {
        toast.error("Failed to delete ticket");
        setConfirmDelete(false);
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">From</dt>
          <dd className="font-medium">{name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="flex items-center gap-2">
            <a href={`mailto:${email}`} className="underline underline-offset-4">
              {email}
            </a>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyEmail}
              aria-label="Copy email address"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </dd>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{createdLabel}</dd>
          <dt className="text-muted-foreground">Updated</dt>
          <dd>{updatedLabel}</dd>
          {resolvedLabel ? (
            <>
              <dt className="text-muted-foreground">Resolved</dt>
              <dd>{resolvedLabel}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Message</h2>
        {/* Untrusted input: rendered as text only, never as HTML */}
        <p className="rounded-md border p-4 whitespace-pre-wrap break-words">
          {message}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Status</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onValueChange={(value) => {
              const parsed = supportStatusSchema.safeParse(value);
              if (parsed.success) void changeStatus(parsed.data);
            }}
          >
            <SelectTrigger className="w-44" aria-label="Ticket status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {supportStatusLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {status === "resolved" ? (
            <Button variant="outline" onClick={() => void changeStatus("open")}>
              Reopen
            </Button>
          ) : (
            <Button onClick={() => void changeStatus("resolved")}>
              Mark resolved
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Internal note</h2>
        <p className="text-sm text-muted-foreground">
          Private. Never shown to the sender.
        </p>
        <Textarea
          aria-label="Internal note"
          value={note}
          maxLength={SUPPORT_LIMITS.noteMax}
          rows={5}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button onClick={saveNote} disabled={savingNote || note === savedNote}>
          {savingNote ? "Saving…" : "Save note"}
        </Button>
      </section>

      <section>
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" />
          Delete ticket
        </Button>
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this ticket?</DialogTitle>
              <DialogDescription>
                It disappears from the admin panel. The row is kept in the database
                (soft delete).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={remove} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
