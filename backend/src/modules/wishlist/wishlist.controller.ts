import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as wishlistService from "./wishlist.service";
import type { AddWishlistItemInput } from "./wishlist.validation";

export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const wishlist = await wishlistService.getWishlist(req.user!.id);
  sendSuccess(res, { wishlist }, "Wishlist retrieved.");
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body as AddWishlistItemInput;
  const wishlist = await wishlistService.addToWishlist(req.user!.id, productId);
  sendSuccess(res, { wishlist }, "Item added to wishlist.", 201);
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const wishlist = await wishlistService.removeFromWishlist(req.user!.id, req.params.id);
  sendSuccess(res, { wishlist }, "Item removed from wishlist.");
});

export const moveToCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await wishlistService.moveToCart(req.user!.id, req.params.id);
  sendSuccess(res, { cart }, "Item moved to cart.");
});
