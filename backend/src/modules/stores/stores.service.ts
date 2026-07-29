import type { Store } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import type { UpdateStoreInput } from "./stores.validation";

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "store";
}

// Slugs are generated once, on approval, and never change afterward — even
// if the seller later renames their store (stores.service.updateMyStore
// never touches slug). Marketplace/store URLs (Phase 5) depend on the slug
// staying stable; regenerating it on every rename would silently break links.
export async function generateUniqueStoreSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;

  while (await prisma.store.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export async function getMyStore(userId: string): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { sellerId: userId } });
  if (!store) throw ApiError.notFound("You do not have a store.", "STORE_NOT_FOUND");
  return store;
}

export async function updateMyStore(userId: string, input: UpdateStoreInput): Promise<Store> {
  await getMyStore(userId);
  return prisma.store.update({ where: { sellerId: userId }, data: input });
}
