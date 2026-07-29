import { Prisma, type Address } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import type { AddressInput, UpdateAddressInput } from "./users.validation";

export async function listAddresses(userId: string): Promise<Address[]> {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

// Ownership is never trusted from the URL alone — every read/write re-checks
// that the address actually belongs to the requesting user. A mismatch is
// reported as 404, not 403, so it doesn't confirm the address id exists at
// all under someone else's account.
async function getOwnedAddressOrThrow(userId: string, addressId: string): Promise<Address> {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw ApiError.notFound("Address not found.", "ADDRESS_NOT_FOUND");
  }
  return address;
}

export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...input, userId } });
  });
}

export async function updateAddress(userId: string, addressId: string, input: UpdateAddressInput): Promise<Address> {
  await getOwnedAddressOrThrow(userId, addressId);

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }
    return tx.address.update({ where: { id: addressId }, data: input });
  });
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  await getOwnedAddressOrThrow(userId, addressId);

  try {
    await prisma.address.delete({ where: { id: addressId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw ApiError.conflict(
        "This address is linked to an existing order and cannot be deleted.",
        "ADDRESS_IN_USE"
      );
    }
    throw error;
  }
}
