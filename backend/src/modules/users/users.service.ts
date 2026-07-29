import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { toSafeUser, type SafeUser } from "../auth/auth.service";
import { ApiError } from "../../utils/ApiError";
import type { UpdateProfileInput } from "./users.validation";

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<SafeUser> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      include: { store: true },
    });
    return toSafeUser(user, user.store);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("This username is already taken.", "USERNAME_TAKEN");
    }
    throw error;
  }
}
