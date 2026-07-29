import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient instance for the whole process. Modules import
// this instead of instantiating their own client.
export const prisma = new PrismaClient();
