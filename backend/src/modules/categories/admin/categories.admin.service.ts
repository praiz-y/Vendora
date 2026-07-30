import { Prisma, type Category, type CategoryStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { ApiError } from "../../../utils/ApiError";
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

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const slug = await generateUniqueCategorySlug(input.name);
  try {
    return await prisma.category.create({ data: { ...input, slug } });
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
export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  await getCategoryOrThrow(id);
  return prisma.category.update({ where: { id }, data: input });
}

export async function archiveCategory(id: string): Promise<Category> {
  await getCategoryOrThrow(id);
  return prisma.category.update({ where: { id }, data: { status: "ARCHIVED" } });
}

export async function activateCategory(id: string): Promise<Category> {
  await getCategoryOrThrow(id);
  return prisma.category.update({ where: { id }, data: { status: "ACTIVE" } });
}
