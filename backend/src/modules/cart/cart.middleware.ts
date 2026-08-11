import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { setGuestCartCookie } from "../../utils/cookies";

function generateGuestCartToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Runs after optionalAuthenticate. An authenticated request always uses the
// user's own Cart (guaranteed to exist — auth.service.ts's register()
// creates one). An anonymous request is identified by an HttpOnly cookie
// holding an unguessable, server-generated token; the matching Cart is
// found or created on the fly. Either way, downstream cart handlers only
// ever deal with req.cart — never with whether the caller was a user or a
// guest.
export async function resolveCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      req.cart = await prisma.cart.findUniqueOrThrow({ where: { userId: req.user.id } });
      next();
      return;
    }

    const cookieToken = req.cookies?.[env.guestCart.cookieName] as string | undefined;
    let cart = cookieToken ? await prisma.cart.findUnique({ where: { guestToken: cookieToken } }) : null;

    if (!cart) {
      const guestToken = generateGuestCartToken();
      cart = await prisma.cart.create({ data: { guestToken } });
      setGuestCartCookie(res, guestToken);
    }

    req.cart = cart;
    next();
  } catch (error) {
    next(error);
  }
}
