"use client";

import { Suspense, useState, type FormEvent } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { useAdminUrlFilters } from "@/lib/useAdminUrlFilters";
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

const statusVariant: Record<CategoryStatus, BadgeVariant> = {
  ACTIVE: "success",
  ARCHIVED: "neutral",
};

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
    <form className="flex max-w-md flex-col gap-3 rounded-md border border-border-admin p-4" onSubmit={handleSubmit}>
      <p className="text-sm font-medium text-heading">New category</p>
      <TextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea
        label="Description (optional)"
        name="description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {createCategory.isError && <FormMessage type="error">{getErrorMessage(createCategory.error)}</FormMessage>}
      <Button type="submit" variant="brand" loading={createCategory.isPending} className="self-start">
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
  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  function handleSave(e: FormEvent) {
    e.preventDefault();
    updateCategory.mutate(
      { id: category.id, input: { name, description: description || undefined } },
      { onSuccess: () => setEditing(false) }
    );
  }

  function handleArchive(e: FormEvent) {
    e.preventDefault();
    archiveCategory.mutate(
      { id: category.id, reason: archiveReason },
      { onSuccess: () => setShowArchiveForm(false) }
    );
  }

  return (
    <div className="rounded-md border border-border-admin p-4">
      {editing ? (
        <form className="flex flex-col gap-3" onSubmit={handleSave}>
          <TextField label="Name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Description" name="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          {updateCategory.isError && <FormMessage type="error">{getErrorMessage(updateCategory.error)}</FormMessage>}
          <div className="flex gap-2">
            <Button type="submit" variant="brand" loading={updateCategory.isPending}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-heading">{category.name}</p>
                <Badge variant={statusVariant[category.status]}>{category.status}</Badge>
              </div>
              <p className="text-xs text-muted">/{category.slug}</p>
              {category.description && <p className="mt-1 text-sm text-body">{category.description}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              {category.status === "ACTIVE" ? (
                <Button variant="danger" onClick={() => setShowArchiveForm((v) => !v)}>
                  Archive
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => activateCategory.mutate(category.id)} loading={activateCategory.isPending}>
                  Activate
                </Button>
              )}
            </div>
          </div>

          {showArchiveForm && (
            <form className="flex max-w-lg flex-col gap-3" onSubmit={handleArchive}>
              <Textarea
                label="Archive reason"
                name="archiveReason"
                required
                minLength={3}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
              />
              {archiveCategory.isError && <FormMessage type="error">{getErrorMessage(archiveCategory.error)}</FormMessage>}
              <Button type="submit" variant="danger" loading={archiveCategory.isPending} className="self-start">
                Confirm archive
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function AdminCategoriesContent() {
  const { get, set } = useAdminUrlFilters();
  const status = (get("status", "ACTIVE") || undefined) as CategoryStatus | undefined;
  const { data, isLoading, isError, error } = useAdminCategories({ status });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-lg font-semibold text-heading">Categories</h2>
        <p className="mt-1 text-sm text-muted">Sellers can only choose from categories you manage here.</p>
      </div>

      <NewCategoryForm />

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => set({ status: tab.value })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === tab.value ? "bg-primary-hover text-white" : "border border-border-admin text-body transition-colors hover:bg-surface-alt"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}

      <div className="flex flex-col gap-3">
        {data?.categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
        {data?.categories.length === 0 && <p className="text-sm text-muted">No categories in this view.</p>}
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted">Loading…</p>}>
      <AdminCategoriesContent />
    </Suspense>
  );
}
