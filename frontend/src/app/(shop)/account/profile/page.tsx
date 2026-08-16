"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { useChangePassword } from "@/features/auth/hooks";
import { useUpdateProfile } from "@/features/users/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { useAuthStore } from "@/stores/authStore";

function ProfileForm() {
  const user = useAuthStore((s) => s.user)!;
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  });

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateProfile.mutate(form);
  }

  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="First name" name="firstName" required value={form.firstName} onChange={handleChange("firstName")} />
        <TextField label="Last name" name="lastName" required value={form.lastName} onChange={handleChange("lastName")} />
      </div>
      <TextField label="Username" name="username" required minLength={3} value={form.username} onChange={handleChange("username")} />
      <TextField label="Email" name="email" value={user.email} disabled title="Email changes aren't supported yet" />

      {updateProfile.isError && <FormMessage type="error">{getErrorMessage(updateProfile.error)}</FormMessage>}
      {updateProfile.isSuccess && <FormMessage type="success">Profile updated.</FormMessage>}

      <Button type="submit" loading={updateProfile.isPending} className="self-start">
        Save changes
      </Button>
    </form>
  );
}

function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    changePassword.mutate({ currentPassword, newPassword });
  }

  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
      <PasswordField
        label="Current password"
        name="currentPassword"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      {changePassword.isError && <FormMessage type="error">{getErrorMessage(changePassword.error)}</FormMessage>}

      <Button type="submit" loading={changePassword.isPending} variant="secondary" className="self-start">
        Change password
      </Button>
      <p className="text-xs text-foreground/50">
        Changing your password will log you out of every device, including this one.
      </p>
    </form>
  );
}

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-10 py-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        <ProfileForm />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
