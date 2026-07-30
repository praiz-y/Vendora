import type { Store } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { slugify } from "../../utils/slug";
import type { UpdateStoreInput } from "./stores.validation";

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

// Products belong to a Store, not directly to a User — every seller-facing
// product operation needs this to scope its queries. requireActiveSeller has
// already confirmed the store is ACTIVE by the time a route gets here.
export async function getMyStoreId(userId: string): Promise<string> {
  const store = await getMyStore(userId);
  return store.id;
}
