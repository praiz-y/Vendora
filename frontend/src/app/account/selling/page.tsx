"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import type { SellerApplicationFormInput } from "@/features/sellerApplications/api";
import { useMyApplication, useSubmitApplication, useUpdateMyApplication } from "@/features/sellerApplications/hooks";
import { useRefreshSession } from "@/features/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { useAuthStore } from "@/stores/authStore";
import type { SellerApplication } from "@/types/store";

const emptyForm: SellerApplicationFormInput = {
  storeName: "",
  storeDescription: "",
  businessCategory: "",
  phone: "",
  email: "",
  location: "",
};

function toFormInput(application: SellerApplication): SellerApplicationFormInput {
  return {
    storeName: application.storeName,
    storeDescription: application.storeDescription,
    storeLogoUrl: application.storeLogoUrl ?? undefined,
    storeBannerUrl: application.storeBannerUrl ?? undefined,
    businessCategory: application.businessCategory,
    phone: application.phone,
    email: application.email,
    location: application.location,
    businessRegistration: application.businessRegistration ?? undefined,
  };
}

function ApplicationForm({ initialValues, mode }: { initialValues: SellerApplicationFormInput; mode: "submit" | "edit" }) {
  const submitApplication = useSubmitApplication();
  const updateApplication = useUpdateMyApplication();
  const [form, setForm] = useState(initialValues);

  const active = mode === "submit" ? submitApplication : updateApplication;

  function handleChange(field: keyof SellerApplicationFormInput) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "submit") {
      submitApplication.mutate(form);
    } else {
      updateApplication.mutate(form);
    }
  }

  return (
    <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit}>
      <TextField label="Store name" name="storeName" required value={form.storeName} onChange={handleChange("storeName")} />
      <Textarea
        label="Store description"
        name="storeDescription"
        required
        minLength={10}
        value={form.storeDescription}
        onChange={handleChange("storeDescription")}
      />
      <TextField
        label="Business category"
        name="businessCategory"
        required
        value={form.businessCategory}
        onChange={handleChange("businessCategory")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Phone" name="phone" required value={form.phone} onChange={handleChange("phone")} />
        <TextField label="Business email" name="email" type="email" required value={form.email} onChange={handleChange("email")} />
      </div>
      <TextField label="Location" name="location" required value={form.location} onChange={handleChange("location")} />
      <TextField
        label="Store logo URL (optional)"
        name="storeLogoUrl"
        value={form.storeLogoUrl ?? ""}
        onChange={handleChange("storeLogoUrl")}
      />
      <TextField
        label="Store banner URL (optional)"
        name="storeBannerUrl"
        value={form.storeBannerUrl ?? ""}
        onChange={handleChange("storeBannerUrl")}
      />
      <TextField
        label="Business registration (optional)"
        name="businessRegistration"
        value={form.businessRegistration ?? ""}
        onChange={handleChange("businessRegistration")}
      />

      {active.isError && <FormMessage type="error">{getErrorMessage(active.error)}</FormMessage>}
      {active.isSuccess && (
        <FormMessage type="success">{mode === "submit" ? "Application submitted." : "Application updated."}</FormMessage>
      )}

      <Button type="submit" loading={active.isPending} className="self-start">
        {mode === "submit" ? "Submit application" : "Save changes"}
      </Button>
    </form>
  );
}

export default function SellingPage() {
  const user = useAuthStore((s) => s.user);
  const { data: application, isLoading } = useMyApplication();
  const refreshSession = useRefreshSession();

  // Covers the moment an admin approves this application while the buyer has
  // this page open: the session's cached `seller` field only updates once we
  // explicitly re-fetch it, so a stale "still pending" view doesn't linger.
  useEffect(() => {
    if (application?.status === "APPROVED" && !user?.seller && !refreshSession.isPending) {
      refreshSession.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.status, user?.seller]);

  if (user?.seller) {
    return (
      <div className="flex flex-col gap-4 py-6">
        <h2 className="text-lg font-semibold">Selling on Vendora</h2>
        <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
          <p className="text-sm">
            You have a store: <span className="font-medium">{user.seller.storeName}</span>
          </p>
          <p className="mt-1 text-sm text-foreground/60">Status: {user.seller.status}</p>
          <Link href="/seller/profile" className="mt-3 inline-block text-sm font-medium underline">
            Go to your seller dashboard →
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <p className="py-6 text-sm text-foreground/60">Loading…</p>;
  }

  if (!application) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div>
          <h2 className="text-lg font-semibold">Become a Seller</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Tell us about your store. An admin will review your application before it goes live.
          </p>
        </div>
        <ApplicationForm initialValues={emptyForm} mode="submit" />
      </div>
    );
  }

  if (application.status === "PENDING") {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div>
          <h2 className="text-lg font-semibold">Seller application: Pending review</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Submitted {new Date(application.submittedAt).toLocaleDateString()}. You can still edit it while it&apos;s
            under review.
          </p>
        </div>
        <ApplicationForm initialValues={toFormInput(application)} mode="edit" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Seller application: Rejected</h2>
        <div className="mt-2">
          <FormMessage type="error">{application.rejectionReason ?? "No reason was given."}</FormMessage>
        </div>
        <p className="mt-2 text-sm text-foreground/60">
          Edit and resubmit your application below — it will go back into the review queue.
        </p>
      </div>
      <ApplicationForm initialValues={toFormInput(application)} mode="edit" />
    </div>
  );
}
