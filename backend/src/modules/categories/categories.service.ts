import type { Category } from "@prisma/client";
import { prisma } from "../../config/prisma";

// The only endpoint any non-admin can reach: active categories to choose
// from when creating a product. Full CRUD (including archived categories)
// is admin-only — see admin/categories.admin.service.ts.
export async function listActiveCategories(): Promise<Category[]> {
  return prisma.category.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });
}
