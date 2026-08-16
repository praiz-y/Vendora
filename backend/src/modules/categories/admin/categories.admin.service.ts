import { Prisma, type Category, type CategoryStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
import { recordAuditLog } from "../../../utils/auditLog";
import { buildPaginationMeta, toSkipTake, type PaginationMeta, type PaginationParams } from "../../../utils/pagination";
import { slugify } from "../../../utils/slug";
import type { CreateCategoryInput, UpdateCategoryInput } from "../categories.validation";

async function generateUniqueCategorySlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;

  while (await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export interface ListCategoriesParams extends PaginationParams {
  status?: CategoryStatus;
}

export async function listCategories(
  params: ListCategoriesParams
): Promise<{ categories: Category[]; meta: PaginationMeta }> {
  const where = params.status ? { status: params.status } : {};

  const [categories, total] = await Promise.all([
    prisma.category.findMany({ where, orderBy: { name: "asc" }, ...toSkipTake(params) }),
    prisma.category.count({ where }),
  ]);

  return { categories, meta: buildPaginationMeta(params, total) };
}

async function getCategoryOrThrow(id: string): Promise<Category> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw ApiError.notFound("Category not found.", "CATEGORY_NOT_FOUND");
  return category;
}

// Overhaul Phase 10: every other admin write action in this codebase
// records an AuditLog entry — Category was the one exception, which made
// the Audit Log page's own "Category" filter option meaningless (nothing
// to ever find). Brought up to the same standard here.
export async function createCategory(adminId: string, input: CreateCategoryInput): Promise<Category> {
  const slug = await generateUniqueCategorySlug(input.name);
  try {
    return await prisma.$transaction(async (tx) => {
      const category = await tx.category.create({ data: { ...input, slug } });
      await recordAuditLog(tx, { actorId: adminId, action: "CATEGORY_CREATED", entityType: "Category", entityId: category.id });
      return category;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("A category with this name already exists.", "CATEGORY_ALREADY_EXISTS");
    }
    throw error;
  }
}

// Slug is intentionally left untouched on rename — same precedent as
// Store/Product slugs: once assigned, a slug never changes, so nothing that
// already links to it (e.g. a product filtered by category) breaks.
export async function updateCategory(adminId: string, id: string, input: UpdateCategoryInput): Promise<Category> {
  await getCategoryOrThrow(id);
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.update({ where: { id }, data: input });
    await recordAuditLog(tx, { actorId: adminId, action: "CATEGORY_UPDATED", entityType: "Category", entityId: id });
    return category;
  });
}

export async function archiveCategory(adminId: string, id: string, reason: string): Promise<Category> {
  await getCategoryOrThrow(id);
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.update({ where: { id }, data: { status: "ARCHIVED" } });
    await recordAuditLog(tx, {
      actorId: adminId,
      action: "CATEGORY_ARCHIVED",
      entityType: "Category",
      entityId: id,
      metadata: { reason },
    });
    return category;
  });
}

export async function activateCategory(adminId: string, id: string): Promise<Category> {
  await getCategoryOrThrow(id);
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.update({ where: { id }, data: { status: "ACTIVE" } });
    await recordAuditLog(tx, { actorId: adminId, action: "CATEGORY_ACTIVATED", entityType: "Category", entityId: id });
    return category;
  });
}
