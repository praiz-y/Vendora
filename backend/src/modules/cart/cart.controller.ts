import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import * as cartService from "./cart.service";
import type { AddCartItemInput, UpdateCartItemInput } from "./cart.validation";

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  sendSuccess(res, { cart }, "Cart retrieved.");
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity } = req.body as AddCartItemInput;
  const cart = await cartService.addToCart(req.user!.id, { productId, quantity });
  sendSuccess(res, { cart }, "Item added to cart.", 201);
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body as UpdateCartItemInput;
  const cart = await cartService.updateCartItemQuantity(req.user!.id, req.params.id, quantity);
  sendSuccess(res, { cart }, "Cart item updated.");
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.removeCartItem(req.user!.id, req.params.id);
  sendSuccess(res, { cart }, "Item removed from cart.");
});
