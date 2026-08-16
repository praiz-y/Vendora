"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminAnnouncement, useUpdateAnnouncement } from "@/features/admin/announcement/hooks";
import type { AdminAnnouncement } from "@/features/admin/announcement/api";
import { getErrorMessage } from "@/lib/api/getErrorMessage";

// Seeds its state from `announcement` once at mount (lazy initializer, not an
// effect) — after that this form owns the value locally, so a background
// refetch after a successful save doesn't stomp the in-flight "Saved" message.
function AnnouncementForm({ announcement }: { announcement: AdminAnnouncement | null }) {
  const updateAnnouncement = useUpdateAnnouncement();
  const [message, setMessage] = useState(announcement?.message ?? "");
  const [enabled, setEnabled] = useState(announcement?.enabled ?? false);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    updateAnnouncement.mutate({ message, enabled }, { onSuccess: () => setSaved(true) });
  }

  return (
    <form className="flex max-w-lg flex-col gap-4 rounded-md border border-border-admin p-4" onSubmit={handleSubmit}>
      <Textarea
        label="Message"
        name="message"
        required
        minLength={1}
        maxLength={150}
        rows={2}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setSaved(false);
        }}
      />
      <p className="-mt-2 text-xs text-muted">{message.length}/150</p>

      <label className="flex items-center gap-2 text-sm text-body">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
        />
        Enabled
      </label>

      {updateAnnouncement.isError && <FormMessage type="error">{getErrorMessage(updateAnnouncement.error)}</FormMessage>}
      {saved && !updateAnnouncement.isPending && <FormMessage type="success">Announcement updated.</FormMessage>}

      <Button type="submit" variant="brand" loading={updateAnnouncement.isPending} className="self-start">
        Save
      </Button>

      {announcement?.updatedBy && (
        <p className="text-xs text-muted">
          Last updated by {announcement.updatedBy.firstName} {announcement.updatedBy.lastName} on{" "}
          {new Date(announcement.updatedAt).toLocaleString()}
        </p>
      )}
    </form>
  );
}

export default function AdminAnnouncementPage() {
  const { data: announcement, isLoading, isError, error } = useAdminAnnouncement();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Announcement Bar</h2>
        <p className="mt-1 text-sm text-muted">Shown site-wide above the header when enabled.</p>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      {!isLoading && !isError && <AnnouncementForm announcement={announcement ?? null} />}
    </div>
  );
}
