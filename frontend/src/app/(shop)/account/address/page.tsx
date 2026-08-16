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

function addressToForm(address: Address) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode ?? "",
  };
}

function EditAddressForm({ address, onDone }: { address: Address; onDone: () => void }) {
  const updateAddress = useUpdateAddress();
  const [form, setForm] = useState(addressToForm(address));

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateAddress.mutate({ id: address.id, input: form }, { onSuccess: onDone });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <TextField label="Full name" name="fullName" required value={form.fullName} onChange={handleChange("fullName")} />
      <TextField label="Phone" name="phone" required value={form.phone} onChange={handleChange("phone")} />
      <TextField label="Address line 1" name="addressLine1" required value={form.addressLine1} onChange={handleChange("addressLine1")} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="City" name="city" required value={form.city} onChange={handleChange("city")} />
        <TextField label="State" name="state" required value={form.state} onChange={handleChange("state")} />
      </div>
      <TextField label="Postal code (optional)" name="postalCode" value={form.postalCode} onChange={handleChange("postalCode")} />

      {updateAddress.isError && <FormMessage type="error">{getErrorMessage(updateAddress.error)}</FormMessage>}

      <div className="flex gap-2">
        <Button type="submit" loading={updateAddress.isPending}>
          Save changes
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddressCard({ address }: { address: Address }) {
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="rounded-md border border-border p-4">
        <EditAddressForm address={address} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm">
          <p className="font-medium text-heading">
            {address.fullName}{" "}
            {address.isDefault && (
              <span className="ml-2 rounded bg-badge-neutral-bg px-1.5 py-0.5 text-xs text-badge-neutral-text">Default</span>
            )}
          </p>
          <p className="text-body">{address.phone}</p>
          <p className="text-body">
            {address.addressLine1}
            {address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.state}, {address.country}
            {address.postalCode ? ` ${address.postalCode}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
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
    <form className="flex max-w-md flex-col gap-4 rounded-md border border-border p-4" onSubmit={handleSubmit}>
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
      <h2 className="text-lg font-semibold text-heading">Addresses</h2>

      {isLoading && <p className="text-sm text-muted">Loading addresses…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-4">
        {addresses?.map((address) => (
          <AddressCard key={address.id} address={address} />
        ))}
        {addresses?.length === 0 && <p className="text-sm text-muted">No addresses saved yet.</p>}
      </div>

      <NewAddressForm />
    </div>
  );
}
