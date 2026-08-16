"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dropzone } from "@/components/ui/Dropzone";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import type { StoreProfileInput } from "@/features/stores/api";
import { useMyStore, useUpdateMyStore } from "@/features/stores/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { Store } from "@/types/store";

function toFormInput(store: Store): StoreProfileInput {
  return {
    name: store.name,
    description: store.description,
    logoUrl: store.logoUrl ?? undefined,
    bannerUrl: store.bannerUrl ?? undefined,
    businessCategory: store.businessCategory,
    phone: store.phone,
    email: store.email,
    location: store.location,
    businessRegistration: store.businessRegistration ?? undefined,
  };
}

function StoreProfileForm({ store }: { store: Store }) {
  const updateStore = useUpdateMyStore();
  const [form, setForm] = useState(toFormInput(store));

  function handleChange(field: keyof StoreProfileInput) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateStore.mutate(form);
  }

  return (
    <form className="flex max-w-lg flex-col gap-4" onSubmit={handleSubmit}>
      <TextField label="Store name" name="name" required value={form.name ?? ""} onChange={handleChange("name")} />
      <Textarea
        label="Store description"
        name="description"
        required
        minLength={10}
        value={form.description ?? ""}
        onChange={handleChange("description")}
      />
      <TextField
        label="Business category"
        name="businessCategory"
        required
        value={form.businessCategory ?? ""}
        onChange={handleChange("businessCategory")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Phone" name="phone" required value={form.phone ?? ""} onChange={handleChange("phone")} />
        <TextField label="Business email" name="email" type="email" required value={form.email ?? ""} onChange={handleChange("email")} />
      </div>
      <TextField label="Location" name="location" required value={form.location ?? ""} onChange={handleChange("location")} />
      <Dropzone
        label="Store logo"
        inputName="logoUrl"
        folder="stores"
        imageUrl={form.logoUrl ?? ""}
        onUrlChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
      />
      <Dropzone
        label="Store banner"
        inputName="bannerUrl"
        folder="stores"
        imageUrl={form.bannerUrl ?? ""}
        onUrlChange={(url) => setForm((f) => ({ ...f, bannerUrl: url }))}
      />
      <TextField
        label="Business registration (optional)"
        name="businessRegistration"
        value={form.businessRegistration ?? ""}
        onChange={handleChange("businessRegistration")}
      />
      <TextField label="Store URL slug" name="slug" value={store.slug} disabled title="The store slug is fixed once approved." />

      {updateStore.isError && <FormMessage type="error">{getErrorMessage(updateStore.error)}</FormMessage>}
      {updateStore.isSuccess && <FormMessage type="success">Store updated.</FormMessage>}

      <Button type="submit" loading={updateStore.isPending} className="self-start">
        Save changes
      </Button>
    </form>
  );
}

export default function SellerProfilePage() {
  const { data: store, isLoading, isError, error } = useMyStore();

  return (
    <div className="flex flex-col gap-6 py-6">
      <h2 className="text-lg font-semibold text-heading">Store Profile</h2>
      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {store && <StoreProfileForm store={store} />}
    </div>
  );
}
