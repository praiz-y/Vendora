"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
} from "@/features/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { Address } from "@/types/user";

const emptyForm = {
  fullName: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

function AddressCard({ address }: { address: Address }) {
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  return (
    <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm">
          <p className="font-medium">
            {address.fullName} {address.isDefault && <span className="ml-2 rounded bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/10">Default</span>}
          </p>
          <p className="text-foreground/70">{address.phone}</p>
          <p className="text-foreground/70">
            {address.addressLine1}
            {address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.state}, {address.country}
            {address.postalCode ? ` ${address.postalCode}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {!address.isDefault && (
            <Button
              variant="secondary"
              onClick={() => updateAddress.mutate({ id: address.id, input: { isDefault: true } })}
              loading={updateAddress.isPending}
            >
              Set default
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => deleteAddress.mutate(address.id)}
            loading={deleteAddress.isPending}
          >
            Delete
          </Button>
        </div>
      </div>
      {deleteAddress.isError && (
        <div className="mt-2">
          <FormMessage type="error">{getErrorMessage(deleteAddress.error)}</FormMessage>
        </div>
      )}
    </div>
  );
}

function NewAddressForm() {
  const createAddress = useCreateAddress();
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createAddress.mutate(form, {
      onSuccess: () => {
        setForm(emptyForm);
        setOpen(false);
      },
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Add address
      </Button>
    );
  }

  return (
    <form className="flex max-w-md flex-col gap-4 rounded-md border border-black/10 p-4 dark:border-white/10" onSubmit={handleSubmit}>
      <TextField label="Full name" name="fullName" required value={form.fullName} onChange={handleChange("fullName")} />
      <TextField label="Phone" name="phone" required value={form.phone} onChange={handleChange("phone")} />
      <TextField label="Address line 1" name="addressLine1" required value={form.addressLine1} onChange={handleChange("addressLine1")} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="City" name="city" required value={form.city} onChange={handleChange("city")} />
        <TextField label="State" name="state" required value={form.state} onChange={handleChange("state")} />
      </div>
      <TextField label="Postal code (optional)" name="postalCode" value={form.postalCode} onChange={handleChange("postalCode")} />

      {createAddress.isError && <FormMessage type="error">{getErrorMessage(createAddress.error)}</FormMessage>}

      <div className="flex gap-2">
        <Button type="submit" loading={createAddress.isPending}>
          Save address
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const { data: addresses, isLoading, isError, error } = useAddresses();

  return (
    <div className="flex flex-col gap-6 py-6">
      <h2 className="text-lg font-semibold">Addresses</h2>

      {isLoading && <p className="text-sm text-foreground/60">Loading addresses…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-4">
        {addresses?.map((address) => (
          <AddressCard key={address.id} address={address} />
        ))}
        {addresses?.length === 0 && <p className="text-sm text-foreground/60">No addresses saved yet.</p>}
      </div>

      <NewAddressForm />
    </div>
  );
}
