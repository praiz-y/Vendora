"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useRequireAuth } from "@/features/auth/useRequireAuth";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/features/cart/hooks";
import { getErrorMessage } from "@/lib/api/getErrorMessage";
import { formatNaira } from "@/lib/currency";
import type { CartItem } from "@/types/cart";

const issueMessages: Record<string, string> = {
  PRODUCT_UNAVAILABLE: "No longer available",
  STORE_UNAVAILABLE: "Seller is currently unavailable",
  INSUFFICIENT_STOCK: "Not enough stock for this quantity",
};

function CartLine({ item }: { item: CartItem }) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const image = item.product.images[0];
  const lineTotal = Number(item.product.price) * item.quantity;

  return (
    <div className="flex items-center gap-4 border-b border-black/5 py-4 last:border-b-0 dark:border-white/5">
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-black/5 dark:bg-white/5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={item.product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-foreground/40">No image</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/products/${item.product.slug}`} className="text-sm font-medium hover:underline">
          {item.product.name}
        </Link>
        <p className="text-sm text-foreground/60">{formatNaira(item.product.price)}</p>
        {!item.isAvailable && item.issue && (
          <p className="text-xs text-red-500">{issueMessages[item.issue] ?? "Unavailable"}</p>
        )}
      </div>

      {item.product.type === "PHYSICAL" ? (
        <input
          type="number"
          min={1}
          max={item.product.stockQuantity ?? undefined}
          value={item.quantity}
          onChange={(e) => updateItem.mutate({ id: item.id, quantity: Math.max(1, Number(e.target.value)) })}
          className="w-16 rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/20 dark:focus:ring-white/30"
        />
      ) : (
        <span className="text-sm text-foreground/50">Qty 1</span>
      )}

      <p className="w-24 text-right text-sm font-medium">{formatNaira(lineTotal)}</p>

      <Button variant="secondary" onClick={() => removeItem.mutate(item.id)} loading={removeItem.isPending}>
        Remove
      </Button>
    </div>
  );
}

export default function CartPage() {
  const authStatus = useRequireAuth();
  const { data: cart, isLoading, isError, error } = useCart();

  if (authStatus !== "authenticated") {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-foreground/60">Loading…</div>;
  }

  const itemsByStore = new Map<string, { storeName: string; items: CartItem[] }>();
  cart?.items.forEach((item) => {
    const key = item.product.store.id;
    if (!itemsByStore.has(key)) itemsByStore.set(key, { storeName: item.product.store.name, items: [] });
    itemsByStore.get(key)!.items.push(item);
  });

  const grandTotal = cart?.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) ?? 0;
  const hasUnavailable = cart?.items.some((item) => !item.isAvailable) ?? false;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Your Cart</h1>

      {isLoading && <p className="text-sm text-foreground/60">Loading…</p>}
      {isError && <FormMessage type="error">{getErrorMessage(error)}</FormMessage>}
      {cart?.items.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-foreground/60">Your cart is empty.</p>
          <Link href="/products">
            <Button variant="secondary">Browse products</Button>
          </Link>
        </div>
      )}

      {itemsByStore.size > 0 && (
        <div className="flex flex-col gap-6">
          {Array.from(itemsByStore.entries()).map(([storeId, group]) => (
            <div key={storeId} className="rounded-md border border-black/10 p-4 dark:border-white/10">
              <h2 className="mb-2 text-sm font-semibold text-foreground/70">{group.storeName}</h2>
              {group.items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </div>
          ))}

          {hasUnavailable && (
            <FormMessage type="error">
              Some items in your cart are no longer available and won&apos;t be included in checkout.
            </FormMessage>
          )}

          <div className="flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10">
            <span className="text-sm text-foreground/60">Subtotal (excludes shipping)</span>
            <span className="text-lg font-semibold">{formatNaira(grandTotal)}</span>
          </div>

          <Link href="/checkout" className="self-end">
            <Button
              disabled={hasUnavailable}
              title={hasUnavailable ? "Remove unavailable items before checking out" : undefined}
            >
              Proceed to Checkout
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
