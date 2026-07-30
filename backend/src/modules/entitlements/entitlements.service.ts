import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

const entitlementInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      store: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.DigitalEntitlementInclude;

// Access always resolves to whichever DigitalProductVersion currently has
// the highest `version` for the product — never the version that existed
// at purchase time. A seller uploading a new version makes every existing
// owner's access "point" at it immediately, with no per-entitlement update
// needed (Overview §21).
async function getLatestVersionInfo(productId: string) {
  const latest = await prisma.digitalProductVersion.findFirst({
    where: { productId },
    orderBy: { version: "desc" },
    select: { version: true, fileType: true, fileSize: true, createdAt: true },
  });
  if (!latest) return null;
  return { ...latest, fileSize: latest.fileSize.toString() };
}

export async function listMyEntitlements(userId: string) {
  const entitlements = await prisma.digitalEntitlement.findMany({
    where: { userId },
    orderBy: { grantedAt: "desc" },
    include: entitlementInclude,
  });

  return Promise.all(
    entitlements.map(async (entitlement) => ({
      ...entitlement,
      latestVersion: await getLatestVersionInfo(entitlement.productId),
    }))
  );
}

export async function getDownload(userId: string, productId: string) {
  const entitlement = await prisma.digitalEntitlement.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!entitlement) {
    throw ApiError.forbidden("You do not have access to this digital product.", "NOT_ENTITLED");
  }

  const latest = await prisma.digitalProductVersion.findFirst({
    where: { productId },
    orderBy: { version: "desc" },
  });
  if (!latest) {
    throw ApiError.notFound("No downloadable file is available for this product yet.", "NO_VERSION_AVAILABLE");
  }

  // fileKey is a plain reference (no Cloudinary/file-storage integration
  // yet — same "plain URL/reference for now" pattern as everywhere else in
  // this project); the real value delivered here is the access-control
  // check above, not actual file serving.
  return { fileKey: latest.fileKey, fileType: latest.fileType, fileSize: latest.fileSize.toString(), version: latest.version };
}
