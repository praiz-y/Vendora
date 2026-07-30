"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import {
  useActivateCategory,
  useAdminCategories,
  useArchiveCategory,
  useCreateCategory,
  useUpdateCategory,
} from "@/features/admin/categories/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import type { Category, CategoryStatus } from "@/types/product";

const statusTabs: { label: string; value: CategoryStatus | undefined }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
  { label: "All", value: undefined },
];

function NewCategoryForm() {
  const createCategory = useCreateCategory();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createCategory.mutate(
      { name, description: description || undefined },
      { onSuccess: () => { setName(""); setDescription(""); } }
    );
  }

  return (
    <form className="flex max-w-md flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/10" onSubmit={handleSubmit}>
      <p className="text-sm font-medium">New category</p>
      <TextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea
        label="Description (optional)"
        name="description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {createCategory.isError && <FormMessage type="error">{getErrorMessage(createCategory.error)}</FormMessage>}
      <Button type="submit" loading={createCategory.isPending} className="self-start">
        Create category
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const updateCategory = useUpdateCategory();
  const archiveCategory = useArchiveCategory();
  const activateCategory = useActivateCategory();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");

  function handleSave(e: FormEvent) {
    e.preventDefault();
    updateCategory.mutate(
      { id: category.id, input: { name, description: description || undefined } },
      { onSuccess: () => setEditing(false) }
    );
  }

  return (
    <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
      {editing ? (
        <form className="flex flex-col gap-3" onSubmit={handleSave}>
          <TextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Description" name="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          {updateCategory.isError && <FormMessage type="error">{getErrorMessage(updateCategory.error)}</FormMessage>}
          <div className="flex gap-2">
            <Button type="submit" loading={updateCategory.isPending}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{category.name}</p>
            <p className="text-xs text-foreground/50">/{category.slug}</p>
            {category.description && <p className="mt-1 text-sm text-foreground/70">{category.description}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {category.status === "ACTIVE" ? (
              <Button variant="danger" onClick={() => archiveCategory.mutate(category.id)} loading={archiveCategory.isPending}>
                Archive
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => activateCategory.mutate(category.id)} loading={activateCategory.isPending}>
                Activate
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [status, setStatus] = useState<CategoryStatus | undefined>("ACTIVE");
  const { data, isLoading, isError, error } = useAdminCategories({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="mt-1 text-sm text-foreground/60">Sellers can only choose from categories you manage here.</p>
      </div>

      <NewCategoryForm />

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value
                ? "bg-foreground text-background"
                : "border border-black/15 text-foreground/70 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
        {data?.categories.length === 0 && <p className="text-sm text-foreground/60">No categories in this view.</p>}
      </div>
    </div>
  );
}
