import type { Cart, UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      // Resolved by cart.middleware.ts's resolveCart() — either the
      // authenticated user's own Cart or a cookie-identified guest Cart.
      cart?: Cart;
    }
  }
}

export {};
